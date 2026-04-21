import database from '../db.js';

class ProjectService {
  /**
   * 获取所有项目（性能优化版：批量查询 + 内存关联）
   * @param {boolean} includePastYears - 是否包含往年数据（已验收且验收年份<当前年份的项目）
   */
  getAllProjects(includePastYears = false) {
    const currentYear = new Date().getFullYear();

    let sql = `SELECT * FROM projects`;
    if (!includePastYears) {
      // 排除：已验收 且 验收日期年份小于当前年份的项目（往年数据）
      sql += ` WHERE NOT (status = '已验收' AND acceptance_date IS NOT NULL AND acceptance_date != '' AND CAST(SUBSTR(acceptance_date, 1, 4) AS INTEGER) < ${currentYear})`;
    }
    sql += ` ORDER BY kickoff_date DESC, created_at DESC`;

    const projects = database.prepare(sql).all();

    // ===== 性能优化：批量查询所有关联数据 =====
    // 原实现：每个项目 5 次查询（N+1 问题）
    // 新实现：总共 5 次查询 + 内存关联

    // 1. 批量查询人员工时明细
    const allPersonHours = database.prepare('SELECT * FROM person_hours').all();
    const personHoursMap = new Map();
    allPersonHours.forEach(p => {
      if (!personHoursMap.has(p.project_id)) personHoursMap.set(p.project_id, []);
      personHoursMap.get(p.project_id).push(p);
    });

    // 2. 批量查询变更记录
    const allChanges = database.prepare('SELECT * FROM project_changes').all();
    const changesMap = new Map();
    allChanges.forEach(c => {
      if (!changesMap.has(c.project_id)) changesMap.set(c.project_id, []);
      changesMap.get(c.project_id).push(c);
    });

    // 3. 批量查询外协采购明细
    const allOutsourcingItems = database.prepare('SELECT * FROM outsourcing_items').all();
    const outsourcingMap = new Map();
    allOutsourcingItems.forEach(item => {
      if (!outsourcingMap.has(item.project_id)) outsourcingMap.set(item.project_id, []);
      outsourcingMap.get(item.project_id).push(item);
    });

    // 4. 批量查询回款节点
    const allPaymentNodes = database.prepare('SELECT * FROM payment_nodes ORDER BY created_at').all();
    const paymentNodesMap = new Map();
    allPaymentNodes.forEach(node => {
      if (!paymentNodesMap.has(node.project_id)) paymentNodesMap.set(node.project_id, []);
      paymentNodesMap.get(node.project_id).push(node);
    });

    // 5. 批量查询里程碑节点数据
    const allMilestones = database.prepare('SELECT * FROM project_milestones ORDER BY id').all();
    const milestonesMap = new Map();
    allMilestones.forEach(m => {
      if (!milestonesMap.has(m.project_id)) milestonesMap.set(m.project_id, []);
      milestonesMap.get(m.project_id).push(m);
    });

    // 使用内存关联丰富项目数据
    return projects.map(project => this.enrichProject(
      project,
      personHoursMap,
      changesMap,
      outsourcingMap,
      paymentNodesMap,
      milestonesMap
    ));
  }

  /**
   * 根据 ID 获取单个项目
   */
  getProjectById(id) {
    const project = database.prepare('SELECT * FROM projects WHERE id = ?').get([id]);

    if (!project) {
      return null;
    }

    // 单个项目查询仍使用单独查询（获取详情时数据量小）
    return this.enrichProject(project);
  }

  /**
   * 创建新项目
   */
  createProject(projectData, autoSave = true) {
    const now = new Date().toISOString();
    const projectId = projectData.id || `PROJ-${Date.now()}`;

    const stmt = database.prepare(`
      INSERT INTO projects (
        id, project_code, project_name, security_level, status, status_comment, risk_reason,
        forecast_acceptance_date, main_work_completed, budget_usage, margin_rate,
        forecast_2026_revenue, forecast_2026_loss_revenue, outsourcer_name, outsourcer_amount,
        outsourcer_tech_content, equipment_spec, outsourcer_ratio, received_thank_you_date,
        document_received_date, remarks, project_highlight, phase, type, level, industry,
        region, is_benchmark, is_highlight, kickoff_date, planned_end_date, contract_end_date,
        acceptance_date, delay_months, acceptance_year, acceptance_control, contract_name,
        group_company, contract_amount, historical_paid, paid_2026, pending, pending_this_year,
        ratio, total_paid, annual_confirmed_revenue, accepted_pending_revenue, initial_quote,
        req_evaluation_fee, internal_cost, internal_profit, total_budget, budget_used_amount,
        planned_total, pmo_annual_total, progress, input_percent, pre_sales_total,
        execution_total, quality_score_raw, project_manager, pre_sales_manager, sales_manager,
        project_director, team_members, milestone_node, is_confirmed, confirmed_date,
        change_count, last_change_date, acceptance_risk_level, project_nature, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const params = [
      projectId,
      projectData.projectCode,
      projectData.projectName,
      projectData.securityLevel || '公开',
      projectData.status,
      projectData.statusComment || '',
      projectData.riskReason || '',
      projectData.forecastAcceptanceDate || '',
      projectData.mainWorkCompleted || '',
      projectData.budgetUsage || '',
      projectData.marginRate || '',
      projectData.forecast2026Revenue || 0,
      projectData.forecast2026LossRevenue || 0,
      projectData.outsourcerName || '',
      projectData.outsourcerAmount || 0,
      projectData.outsourcerTechContent || '',
      projectData.equipmentSpec || '',
      projectData.outsourcerRatio || '',
      projectData.receivedThankYouDate || '',
      projectData.documentReceivedDate || '',
      projectData.remarks || '',
      projectData.projectHighlight || '',
      projectData.phase || '',
      projectData.type || '',
      projectData.level || '',
      projectData.industry || '',
      projectData.region,
      projectData.isBenchmark ? 1 : 0,
      projectData.isHighlight ? 1 : 0,
      projectData.timeline?.kickoffDate || '',
      projectData.timeline?.plannedEndDate || '',
      projectData.timeline?.contractEndDate || '',
      projectData.timeline?.acceptanceDate || '',
      projectData.timeline?.delayMonths || 0,
      projectData.timeline?.acceptanceYear || '',
      projectData.timeline?.acceptanceControl || '',
      projectData.payment?.contractName || '',
      projectData.payment?.groupCompany || '',
      projectData.payment?.contractAmount || 0,
      projectData.payment?.historicalPaid || 0,
      projectData.payment?.paid2026 || 0,
      projectData.payment?.pending || 0,
      projectData.payment?.pendingThisYear || 0,
      projectData.payment?.ratio || 0,
      projectData.payment?.totalPaid || 0,
      projectData.payment?.annualConfirmedRevenue || 0,
      projectData.payment?.acceptedPendingRevenue || 0,
      projectData.budget?.initialQuote || 0,
      projectData.budget?.reqEvaluationFee || 0,
      projectData.budget?.internalCost || 0,
      projectData.budget?.internalProfit || 0,
      projectData.budget?.totalBudget || 0,
      projectData.budget?.budgetUsedAmount || 0,
      projectData.manHours?.plannedTotal || 0,
      projectData.manHours?.pmoAnnualTotal || 0,
      projectData.execution?.progress || 0,
      projectData.execution?.inputPercent || 0,
      projectData.ratings?.preSalesTotal || 0,
      projectData.ratings?.executionTotal || 0,
      projectData.ratings?.qualityScoreRaw || 0,
      projectData.members?.projectManager || '',
      projectData.members?.preSalesManager || '',
      projectData.members?.salesManager || '',
      projectData.members?.projectDirector || '',
      JSON.stringify(projectData.members?.teamMembers || []),
      projectData.milestoneNode || '',
      projectData.payment?.isConfirmed ? 1 : 0,
      projectData.payment?.confirmedDate || '',
      0, // change_count
      null, // last_change_date
      projectData.acceptanceRiskLevel || '',
      JSON.stringify(projectData.projectNature || []),
      now,
      now
    ];

    console.log(`[ProjectService.createProject] 传入参数数量: ${params.length}`);
    // 检查是否有参数是数组
    const arrayParams = params.filter((p, idx) => Array.isArray(p));
    if (arrayParams.length > 0) {
      console.log(`[ProjectService.createProject] 数组参数索引: ${params.map((p, idx) => Array.isArray(p) ? idx : -1).filter(i => i >= 0)}`);
    }

    stmt.run(...params);

    // 保存人员工时数据
    if (projectData.manHours?.personnelDetails) {
      this.savePersonnelDetails(projectId, projectData.manHours.personnelDetails);
    }

    // 保存变更记录
    if (projectData.changes) {
      this.saveProjectChanges(projectId, projectData.changes);
    }

    // 保存外协采购明细
    if (projectData.budget?.outsourcingItems) {
      this.saveOutsourcingItems(projectId, projectData.budget.outsourcingItems);
    }

    // 保存回款节点
    if (projectData.payment?.paymentNodes) {
      this.savePaymentNodes(projectId, projectData.payment.paymentNodes);
    }

    if (autoSave) {
      database.save();
    }

    return this.getProjectById(projectId);
  }

  /**
   * 更新项目
   */
  updateProject(id, projectData, autoSave = true) {
    const now = new Date().toISOString();

    const stmt = database.prepare(`
      UPDATE projects SET
        project_code = ?, project_name = ?, security_level = ?, status = ?,
        status_comment = ?, risk_reason = ?, forecast_acceptance_date = ?,
        main_work_completed = ?, budget_usage = ?, margin_rate = ?,
        forecast_2026_revenue = ?, forecast_2026_loss_revenue = ?,
        outsourcer_name = ?, outsourcer_amount = ?, outsourcer_tech_content = ?,
        equipment_spec = ?, outsourcer_ratio = ?, received_thank_you_date = ?,
        document_received_date = ?, remarks = ?, project_highlight = ?, phase = ?, type = ?,
        level = ?, industry = ?, region = ?, is_benchmark = ?, is_highlight = ?,
        kickoff_date = ?, planned_end_date = ?, contract_end_date = ?,
        acceptance_date = ?, delay_months = ?, acceptance_year = ?,
        acceptance_control = ?, contract_name = ?, group_company = ?,
        contract_amount = ?, historical_paid = ?, paid_2026 = ?, pending = ?,
        pending_this_year = ?, ratio = ?, total_paid = ?, annual_confirmed_revenue = ?,
        accepted_pending_revenue = ?, initial_quote = ?, req_evaluation_fee = ?,
        internal_cost = ?, internal_profit = ?, total_budget = ?,
        budget_used_amount = ?, planned_total = ?,
        pmo_annual_total = ?, progress = ?, input_percent = ?,
        pre_sales_total = ?, execution_total = ?, quality_score_raw = ?,
        project_manager = ?,
        pre_sales_manager = ?, sales_manager = ?, project_director = ?,
        team_members = ?, milestone_node = ?, is_confirmed = ?, confirmed_date = ?,
        change_count = ?, last_change_date = ?, acceptance_risk_level = ?, project_nature = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      projectData.projectCode,
      projectData.projectName,
      projectData.securityLevel,
      projectData.status,
      projectData.statusComment,
      projectData.riskReason,
      projectData.forecastAcceptanceDate,
      projectData.mainWorkCompleted,
      projectData.budgetUsage,
      projectData.marginRate,
      projectData.forecast2026Revenue,
      projectData.forecast2026LossRevenue,
      projectData.outsourcerName,
      projectData.outsourcerAmount,
      projectData.outsourcerTechContent,
      projectData.equipmentSpec,
      projectData.outsourcerRatio,
      projectData.receivedThankYouDate,
      projectData.documentReceivedDate,
      projectData.remarks,
      projectData.projectHighlight || '',
      projectData.phase,
      projectData.type,
      projectData.level,
      projectData.industry,
      projectData.region,
      projectData.isBenchmark ? 1 : 0,
      projectData.isHighlight ? 1 : 0,
      projectData.timeline?.kickoffDate,
      projectData.timeline?.plannedEndDate,
      projectData.timeline?.contractEndDate,
      projectData.timeline?.acceptanceDate,
      projectData.timeline?.delayMonths,
      projectData.timeline?.acceptanceYear,
      projectData.timeline?.acceptanceControl,
      projectData.payment?.contractName,
      projectData.payment?.groupCompany,
      projectData.payment?.contractAmount,
      projectData.payment?.historicalPaid,
      projectData.payment?.paid2026,
      projectData.payment?.pending,
      projectData.payment?.pendingThisYear,
      projectData.payment?.ratio,
      projectData.payment?.totalPaid,
      projectData.payment?.annualConfirmedRevenue,
      projectData.payment?.acceptedPendingRevenue,
      projectData.budget?.initialQuote,
      projectData.budget?.reqEvaluationFee,
      projectData.budget?.internalCost,
      projectData.budget?.internalProfit,
      projectData.budget?.totalBudget,
      projectData.budget?.budgetUsedAmount,
      projectData.manHours?.plannedTotal,
      projectData.manHours?.pmoAnnualTotal,
      projectData.execution?.progress,
      projectData.execution?.inputPercent,
      projectData.ratings?.preSalesTotal,
      projectData.ratings?.executionTotal,
      projectData.ratings?.qualityScoreRaw,
      projectData.members?.projectManager,
      projectData.members?.preSalesManager,
      projectData.members?.salesManager,
      projectData.members?.projectDirector,
      JSON.stringify(projectData.members?.teamMembers || []),
      projectData.milestoneNode || '',
      projectData.payment?.isConfirmed ? 1 : 0,
      projectData.payment?.confirmedDate || '',
      projectData.changeCount || 0,
      projectData.lastChangeDate || null,
      projectData.acceptanceRiskLevel || '',
      JSON.stringify(projectData.projectNature || []),
      now,
      id
    );

    // 删除旧数据并保存新数据
    database.prepare('DELETE FROM person_hours WHERE project_id = ?').run([id]);
    database.prepare('DELETE FROM project_changes WHERE project_id = ?').run([id]);
    database.prepare('DELETE FROM outsourcing_items WHERE project_id = ?').run([id]);
    database.prepare('DELETE FROM payment_nodes WHERE project_id = ?').run([id]);

    if (projectData.manHours?.personnelDetails) {
      this.savePersonnelDetails(id, projectData.manHours.personnelDetails);
    }

    if (projectData.changes) {
      this.saveProjectChanges(id, projectData.changes);
    }

    if (projectData.budget?.outsourcingItems) {
      this.saveOutsourcingItems(id, projectData.budget.outsourcingItems);
    }

    // 保存回款节点
    if (projectData.payment?.paymentNodes) {
      this.savePaymentNodes(id, projectData.payment.paymentNodes);
    }

    if (autoSave) {
      database.save();
    }

    return this.getProjectById(id);
  }

  /**
   * 删除项目
   */
  deleteProject(id) {
    const project = this.getProjectById(id);
    if (!project) {
      return false;
    }

    database.prepare('DELETE FROM projects WHERE id = ?').run([id]);
    database.save();

    return true;
  }

  /**
   * 批量导入项目
   */
  batchImportProjects(projects) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    database.transaction(() => {
      projects.forEach(project => {
        try {
          // 检查项目是否已存在
          const existing = database.prepare('SELECT id FROM projects WHERE id = ?').get([project.id]);

          if (existing) {
            // 更新现有项目
            this.updateProject(project.id, project, false);
          } else {
            // 创建新项目
            this.createProject(project, false);
          }
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            projectId: project.id,
            error: error.message
          });
        }
      });
    });

    // 批量导入完成后保存一次
    database.save();

    return results;
  }

  /**
   * 保存人员工时明细
   */
  savePersonnelDetails(projectId, personnelDetails) {
    const stmt = database.prepare(`
      INSERT INTO person_hours (project_id, name, role, monthly_data)
      VALUES (?, ?, ?, ?)
    `);

    personnelDetails.forEach(person => {
      stmt.run(
        projectId,
        person.name,
        person.role,
        JSON.stringify(person.monthly || [])
      );
    });
  }

  /**
   * 保存项目变更记录
   */
  saveProjectChanges(projectId, changes) {
    const stmt = database.prepare(`
      INSERT INTO project_changes (project_id, type, reason, content, before, after, impacts_performance, change_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    changes.forEach(change => {
      stmt.run(
        projectId,
        change.type,
        change.reason,
        change.content,
        change.before,
        change.after,
        change.impactsPerformance ? 1 : 0,
        change.date
      );
    });
  }

  /**
   * 保存回款节点
   */
  savePaymentNodes(projectId, nodes) {
    const stmt = database.prepare(`
      INSERT INTO payment_nodes (project_id, node_name, expected_amount, actual_amount, payment_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    nodes.forEach(node => {
      stmt.run(
        projectId,
        node.nodeName,
        node.expectedAmount,
        node.actualAmount || 0,
        node.paymentDate || ''
      );
    });
  }

  /**
   * 保存外协采购明细
   */
  saveOutsourcingItems(projectId, items) {
    const stmt = database.prepare(`
      INSERT INTO outsourcing_items (project_id, type, name, spec, quantity, supplier, total_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    items.forEach(item => {
      stmt.run(
        projectId,
        item.type,
        item.name,
        item.spec,
        item.quantity,
        item.supplier,
        item.totalAmount
      );
    });
  }

  /**
   * 丰富项目数据（关联查询）- 性能优化版
   * @param {Object} project - 项目数据
   * @param {Map} personHoursMap - 预加载的人员工时 Map（可选）
   * @param {Map} changesMap - 预加载的变更记录 Map（可选）
   * @param {Map} outsourcingMap - 预加载的外协采购 Map（可选）
   * @param {Map} paymentNodesMap - 预加载的回款节点 Map（可选）
   * @param {Map} milestonesMap - 预加载的里程碑 Map（可选）
   */
  enrichProject(project, personHoursMap, changesMap, outsourcingMap, paymentNodesMap, milestonesMap) {
    // 转换布尔值
    project.is_benchmark = Boolean(project.is_benchmark);
    project.is_highlight = Boolean(project.is_highlight);
    project.is_confirmed = Boolean(project.is_confirmed);

    // 转换字段名
    project.projectHighlight = project.project_highlight || '';
    project.milestoneNode = project.milestone_node || '';
    project.isConfirmed = Boolean(project.is_confirmed);
    project.confirmedDate = project.confirmed_date || '';

    // ===== 获取关联数据：优先使用预加载 Map，否则单独查询 =====

    // 获取人员工时明细
    let personHours;
    if (personHoursMap) {
      personHours = personHoursMap.get(project.id) || [];
    } else {
      personHours = database.prepare('SELECT * FROM person_hours WHERE project_id = ?').all([project.id]);
    }
    project.personnelDetails = personHours.map(p => ({
      name: p.name,
      role: p.role,
      monthly: p.monthly_data ? JSON.parse(p.monthly_data) : []
    }));

    // 获取变更记录
    let changes;
    if (changesMap) {
      changes = changesMap.get(project.id) || [];
    } else {
      changes = database.prepare('SELECT * FROM project_changes WHERE project_id = ?').all([project.id]);
    }
    project.changes = changes.map(c => ({
      id: c.id,
      type: c.type,
      reason: c.reason,
      content: c.content,
      before: c.before,
      after: c.after,
      impactsPerformance: Boolean(c.impacts_performance),
      date: c.change_date
    }));

    // 获取外协采购明细
    let outsourcingItems;
    if (outsourcingMap) {
      outsourcingItems = outsourcingMap.get(project.id) || [];
    } else {
      outsourcingItems = database.prepare('SELECT * FROM outsourcing_items WHERE project_id = ?').all([project.id]);
    }
    project.outsourcingItems = outsourcingItems.map(item => ({
      id: item.id,
      type: item.type,
      name: item.name,
      spec: item.spec,
      quantity: item.quantity,
      supplier: item.supplier,
      totalAmount: item.total_amount
    }));

    // 获取回款节点
    let paymentNodes;
    if (paymentNodesMap) {
      paymentNodes = paymentNodesMap.get(project.id) || [];
    } else {
      paymentNodes = database.prepare('SELECT * FROM payment_nodes WHERE project_id = ? ORDER BY created_at').all([project.id]);
    }
    project.paymentNodes = paymentNodes.map(node => ({
      id: String(node.id),
      nodeName: node.node_name,
      expectedAmount: node.expected_amount,
      actualAmount: node.actual_amount || 0,
      paymentDate: node.payment_date || ''
    }));

    // 获取里程碑节点数据
    let milestones;
    if (milestonesMap) {
      milestones = milestonesMap.get(project.id) || [];
    } else {
      milestones = database.prepare('SELECT * FROM project_milestones WHERE project_id = ? ORDER BY id').all([project.id]);
    }
    project.milestoneNodeData = {};
    milestones.forEach(m => {
      // 将中文节点名转换为枚举值
      const nodeEnum = this.getNodeEnumFromLabel(m.milestone_node);
      if (nodeEnum) {
        project.milestoneNodeData[nodeEnum] = {
          plannedDate: m.planned_date || '',
          actualDate: m.actual_date || ''
        };
      }
    });

    // 计算回款相关字段
    const totalPaid = paymentNodes.reduce((sum, node) => sum + (node.actualAmount || 0), 0);
    const paid2026 = paymentNodes.filter(node => {
      if (!node.paymentDate) return false;
      return node.paymentDate.startsWith('2026');
    }).reduce((sum, node) => sum + (node.actualAmount || 0), 0);

    project.totalPaid = totalPaid;
    project.paid2026 = paid2026;
    project.pending = (project.contract_amount || 0) - totalPaid;
    project.ratio = (project.contract_amount || 0) > 0 ? ((paid2026 / project.contract_amount) * 100) : 0;
    project.historicalPaid = totalPaid - paid2026;
    project.pendingThisYear = project.pending;

    // 设置外协金额字段
    project.outsourcer_amount = project.outsourcer_amount || 0;

    // 计算确认收入相关字段
    if (project.is_confirmed && project.confirmed_date) {
      project.annualConfirmedRevenue = project.contract_amount || 0;
      project.acceptedPendingRevenue = 0;
    } else if (project.status === '已验收' || project.status === 'Accepted') {
      project.annualConfirmedRevenue = 0;
      project.acceptedPendingRevenue = project.contract_amount || 0;
    } else {
      project.annualConfirmedRevenue = 0;
      project.acceptedPendingRevenue = 0;
    }

    // 转换团队成员 JSON
    try {
      project.team_members = project.team_members ? JSON.parse(project.team_members) : [];
    } catch {
      project.team_members = [];
    }

    return project;
  }

  /**
   * 获取管理员 IP 列表
   */
  getAdminIps() {
    return database.prepare('SELECT * FROM admin_ips ORDER BY created_at DESC').all();
  }

  /**
   * 添加管理员 IP
   */
  addAdminIp(ipAddress, description = '') {
    try {
      database.prepare(`
        INSERT INTO admin_ips (ip_address, description)
        VALUES (?, ?)
      `).run([ipAddress, description]);

      database.save();
      return true;
    } catch (error) {
      if (error.message && error.message.includes('UNIQUE')) {
        return false; // IP 已存在
      }
      throw error;
    }
  }

  /**
   * 删除管理员 IP
   */
  removeAdminIp(id) {
    database.prepare('DELETE FROM admin_ips WHERE id = ?').run([id]);
    database.save();
    return true;
  }

  /**
   * 检查是否为管理员 IP
   */
  isAdminIp(ipAddress) {
    const admin = database.prepare('SELECT * FROM admin_ips WHERE ip_address = ?').get([ipAddress]);
    return !!admin;
  }

  /**
   * 将中文里程碑节点名转换为枚举值
   */
  getNodeEnumFromLabel(label) {
    const mapping = {
      '早期报价': 'early_quote',
      '级别确定': 'level_determined',
      '需求评估': 'requirement_evaluation',
      '报价审批': 'quote_approval',
      '项目投标': 'project_bidding',
      '任务书审批': 'task_approval',
      '合同审批': 'contract_approval',
      '项目启动': 'project_start',
      '计划预算': 'plan_budget',
      '概要方案': 'overview_solution',
      '详细方案': 'detailed_solution',
      '内部验收': 'internal_acceptance',
      '已验收': 'accepted'
    };
    return mapping[label] || null;
  }

  /**
   * 将枚举值转换为中文里程碑节点名
   */
  getLabelFromNodeEnum(enumValue) {
    const mapping = {
      'early_quote': '早期报价',
      'level_determined': '级别确定',
      'requirement_evaluation': '需求评估',
      'quote_approval': '报价审批',
      'project_bidding': '项目投标',
      'task_approval': '任务书审批',
      'contract_approval': '合同审批',
      'project_start': '项目启动',
      'plan_budget': '计划预算',
      'overview_solution': '概要方案',
      'detailed_solution': '详细方案',
      'internal_acceptance': '内部验收',
      'accepted': '已验收'
    };
    return mapping[enumValue] || null;
  }

  /**
   * 获取所有验收追踪项目
   */
  getAcceptanceTrackingProjects() {
    const projects = database.prepare(`
      SELECT * FROM projects
      WHERE is_acceptance_tracking = 1
      ORDER BY acceptance_tracking_date DESC, kickoff_date DESC
    `).all();

    return projects.map(project => this.enrichProject(project));
  }

  /**
   * 更新项目的验收追踪勾选状态
   */
  toggleAcceptanceTracking(projectId, isTracking, trackingDate) {
    try {
      database.prepare(`
        UPDATE projects
        SET is_acceptance_tracking = ?,
            acceptance_tracking_date = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run([isTracking ? 1 : 0, trackingDate || null, projectId]);

      database.save();
      return true;
    } catch (error) {
      console.error('更新验收追踪状态失败:', error);
      return false;
    }
  }

  /**
   * 更新验收追踪项目字段
   */
  updateTrackingFields(projectId, updateData) {
    try {
      const allowedFields = [
        'tracking_acceptance_risk',
        'tracking_revenue_risk',
        'solution_measures',
        'is_new_tracking',
        'acceptance_control',
        'risk_reason'
      ];

      const updates = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        return false;
      }

      updates.push('updated_at = datetime("now", "localtime")');
      values.push(projectId);

      database.prepare(`
        UPDATE projects
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(values);

      database.save();
      return true;
    } catch (error) {
      console.error('更新验收追踪字段失败:', error);
      return false;
    }
  }
}

export default new ProjectService();