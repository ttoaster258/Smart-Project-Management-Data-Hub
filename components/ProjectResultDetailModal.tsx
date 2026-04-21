import React, { useState, useEffect, useMemo } from 'react';
import { ProjectResultListItem, ProjectResultDetail, ModelResult, SoftwareResult, DocumentStatus, DOCUMENT_TYPES } from '../types';
import ProjectResultDataService from '../services/ProjectResultDataService';

interface Props {
  projectId: string;
  project: ProjectResultListItem;
  onClose: () => void;
  onSave: () => void;
  canEditPmoScore?: boolean;  // 是否可以编辑PMO评分
  canEditConclusion?: boolean;  // 是否可以编辑评议结论
  userRole?: string;  // 用户角色
}

type TabType = 'basic' | 'result' | 'pmo_score' | 'director_score';

const ProjectResultDetailModal: React.FC<Props> = ({ projectId, project, onClose, onSave, canEditPmoScore = true, canEditConclusion = true, userRole = 'admin' }) => {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ProjectResultDetail | null>(null);

  // 编辑状态
  const [editData, setEditData] = useState<{
    svnAddress: string;
    modelResults: ModelResult[];
    softwareResults: SoftwareResult[];
    documentStatus: DocumentStatus[];
    projectResult: any;
  }>({
    svnAddress: '',
    modelResults: [],
    softwareResults: [],
    documentStatus: [],
    projectResult: {}
  });

  // 加载详情数据
  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      const result = await ProjectResultDataService.fetchProjectResultDetail(projectId);
      if (result.success && result.data) {
        setDetail(result.data);
        // 初始化编辑数据
        setEditData({
          svnAddress: result.data.svnAddress || '',
          modelResults: result.data.modelResults || [],
          softwareResults: result.data.softwareResults || [],
          documentStatus: result.data.documentStatus && result.data.documentStatus.length > 0
            ? result.data.documentStatus
            : DOCUMENT_TYPES.map(docType => ({ documentType: docType, isSubmitted: false })),
          projectResult: result.data.projectResult || {}
        });
      }
      setLoading(false);
    };
    loadDetail();
  }, [projectId]);

  // 计算实施团队合计
  const implTotalScore = useMemo(() => {
    if (!editData.projectResult) return 0;
    const pr = editData.projectResult;
    let total = 0;
    total += (pr.implHardSatisfaction || 0);
    total += (pr.implHardSubmitQuality || 0);
    total += (pr.implHardRequirement || 0);
    total += (pr.implHardRisk || 0);
    total += (pr.implPmoHardDelay || 0);
    total += (pr.implPmoHardNode || 0);
    total += (pr.implPmoHardMaterial || 0);
    total += (pr.implPmoHardDigital || 0);
    total += (pr.implPmoHardCost || 0);
    if (pr.implIsRecommended) {
      if (pr.implSoftTechPmoConclusion === '通过') total += (pr.implSoftTechScore || 0);
      if (pr.implSoftTeamPmoConclusion === '通过') total += (pr.implSoftTeamScore || 0);
      if (pr.implSoftResultPmoConclusion === '通过') total += (pr.implSoftResultScore || 0);
    }
    return total;
  }, [editData.projectResult]);

  // 计算售前团队合计
  const preSalesTotalScore = useMemo(() => {
    if (!editData.projectResult) return 0;
    const pr = editData.projectResult;
    let total = 0;
    total += (pr.preSalesHardRequirement || 0);
    total += (pr.preSalesHardSolution || 0);
    total += (pr.preSalesHardRisk || 0);
    total += (pr.preSalesPmoHardActivity || 0);
    total += (pr.preSalesPmoHardDigital || 0);
    total += (pr.preSalesPmoHardInput || 0);
    if (pr.preSalesIsRecommended) {
      if (pr.preSalesSoftTechPmoConclusion === '通过') total += (pr.preSalesSoftTechScore || 0);
      if (pr.preSalesSoftDirectionPmoConclusion === '通过') total += (pr.preSalesSoftDirectionScore || 0);
      if (pr.preSalesSoftPromotionPmoConclusion === '通过') total += (pr.preSalesSoftPromotionScore || 0);
    }
    return total;
  }, [editData.projectResult]);

  const updateModelResult = (index: number, field: keyof ModelResult, value: string) => {
    setEditData(prev => {
      const newResults = [...prev.modelResults];
      newResults[index] = { ...newResults[index], [field]: value };
      return { ...prev, modelResults: newResults };
    });
  };

  const addModelResult = () => {
    setEditData(prev => ({
      ...prev,
      modelResults: [...prev.modelResults, { modelName: '', problemScenario: '', valueExtraction: '' }]
    }));
  };

  const removeModelResult = (index: number) => {
    setEditData(prev => ({
      ...prev,
      modelResults: prev.modelResults.filter((_, i) => i !== index)
    }));
  };

  const updateSoftwareResult = (index: number, field: keyof SoftwareResult, value: string) => {
    setEditData(prev => {
      const newResults = [...prev.softwareResults];
      newResults[index] = { ...newResults[index], [field]: value };
      return { ...prev, softwareResults: newResults };
    });
  };

  const addSoftwareResult = () => {
    setEditData(prev => ({
      ...prev,
      softwareResults: [...prev.softwareResults, { softwareName: '', problemScenario: '', valueExtraction: '' }]
    }));
  };

  const removeSoftwareResult = (index: number) => {
    setEditData(prev => ({
      ...prev,
      softwareResults: prev.softwareResults.filter((_, i) => i !== index)
    }));
  };

  const updateDocumentStatus = (index: number, isSubmitted: boolean) => {
    setEditData(prev => {
      const newStatus = [...prev.documentStatus];
      newStatus[index] = { ...newStatus[index], isSubmitted };
      return { ...prev, documentStatus: newStatus };
    });
  };

  const updateScore = (field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      projectResult: {
        ...prev.projectResult,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // 根据用户角色选择不同的保存方法
    const saveMethod = (userRole === 'regional_director')
      ? ProjectResultDataService.saveDirectorScore
      : ProjectResultDataService.saveProjectResult;

    const result = await saveMethod(projectId, {
      ...editData,
      projectResult: {
        ...editData.projectResult,
        implTotalScore,
        preSalesTotalScore
      }
    });
    setSaving(false);
    if (result.success) {
      onSave();
      onClose();
    } else {
      alert(result.error || '保存失败');
    }
  };

  // 评分项说明
  const scoreTooltips: Record<string, string> = {
    // 实施团队 - PMO评分
    implPmoHardDelay: '本项15分，延期1次扣5分，在此基础上，每延期1个月加扣2分，延期2次及以上或延期3个月以上记为0分，出现项目延期未及时提交延期申请，则为0分。',
    implPmoHardNode: '本项15分，活动未按照正常节点要求执行，每次扣3分，3次以上记为0分，出现未完成的流程节点，则本条目整体记为0分。',
    implPmoHardMaterial: '此项5分，材料规范性不满足制度要求，每项扣1分，直至扣完为止。若客户满意度较差、项目提交的材料不完整或质量较差，则本条目整体记为0分。',
    implPmoHardDigital: '本项10分，依据PMO通报扣分，每次扣2分，直到扣完为止。',
    implPmoHardCost: '本项10分，当（项目成本-项目预算）/项目预算>0时，比值每增加1%扣2分，直到扣完为止。',
    // 售前团队 - PMO评分
    preSalesPmoHardActivity: '本项10分，活动未按照正常流程节点要求执行，每次扣3分，3次及以上记为0分。出现未完成的流程节点，则本条目整体记为0分。',
    preSalesPmoHardDigital: '本项5分，依据PMO通报扣分，每次扣1分，直到扣完为止。',
    preSalesPmoHardInput: '本项15分，投入评估准确度，A级，得15分，B级，得10分，C级，得5分，D级，得0分。',
    // 实施团队 - 总监评分（硬性）
    implHardSatisfaction: '此项15分，所属区域项目主管、销售经理和售前经理进行客户满意度调查和打分评价，A级，得15分，B级，得10分，C级，得5分，D级，得0分。',
    implHardSubmitQuality: '此项10分，所属区域项目主管组织对项目提交物质量检查情况，A级，得10分，B级，得7分，C级，得4分，D级，得0分。',
    implHardRequirement: '本项10分，所属区域项目主管组织对给出的需求变更应对方案打分，A级，得10分，B级，得7分，C级，得4分，D级，得0分。出现需求变更，未及时提交需求变更申请，则本条目整体记为0分。',
    implHardRisk: '本项10分，所属区域项目主管组织对给出的风险控制应对方案打分，A级，得10分，B级，得7分，C级，得4分，D级，得0分。未及时识别和报备风险/未采取有效措施控制风险/结项时存在风险项未关闭，则本条目整体记为0分。',
    // 实施团队 - 总监评分（软性）
    implSoftTech: '考评点为项目实施过程中技术突破和技术创新情况。本项8分，所属区域项目主管给出推荐说明，PMO组织专家评估，若存在较大技术突破或技术创新，得8分。',
    implSoftTeam: '考评点为项目团队成员在项目执行过程中的团队作战水平情况。本项6分，所属区域项目主管给出推荐说明，PMO组织专家评估，若项目团队工作态度、协作精神、技能提升等方面均有出色表现，得6分。',
    implSoftResult: '考评点为共性成果的提炼和积累情况。本项6分，所属区域项目主管给出推荐说明，PMO组织专家评估，并对纳入同元知识库的项目共性成果进行定级，A级，得6分，B级，得4分，C级，得2分。',
    // 售前团队 - 总监评分（硬性）
    preSalesHardRequirement: '本项30分，其中15分为项目需求变更情况，轻度变更1次扣5分，中度变更1次扣15分；另15分为售前转实施的条目化需求是否准确，完全不准确，每条扣5分，部分不准确，每条扣3分。出现项目需求重大变更或3条以上需求完全不准确，则本条目整体记为0分。',
    preSalesHardSolution: '本项25分，其中用户需求贴合度10分，技术思路清晰性8分，技术要点完整性7分，均按A/B/C/D级评分。3处及以上用户需求不贴合或3条及以上技术思路不清晰或3个及以上技术要点不完整，则本条目整体记为0分。',
    preSalesHardRisk: '本项15分，出现低风险1次扣3分，出现中风险1次扣5分。出现高风险，则本条目整体记为0分。',
    // 售前团队 - 总监评分（软性）
    preSalesSoftTech: '考评点为技术空白填补和产品功能扩展情况。本项8分，所属区域项目主管给出推荐说明，PMO组织专家评估，若在技术空白填补和产品功能扩展等方面具有很好的效果，得8分。',
    preSalesSoftDirection: '考评点为新行业、新对象、新场景拓展情况。本项6分，所属区域项目主管给出推荐说明，PMO组织专家评估，若在新行业、新对象、新场景等方面具有很好的拓展效果，得6分。',
    preSalesSoftPromotion: '考评点为共性成果在项目中的复用情况。本项6分，所属区域项目主管组织对项目共性成果的复用情况进行评估，A级，得6分，B级，得4分，C级，得2分，D级，得0分。',
  };

  // 带提示的标签组件
  const renderLabelWithTooltip = (label: string, field: string) => (
    <div className="flex items-center space-x-1.5 group relative">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="relative">
        <svg className="w-3.5 h-3.5 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-[11px] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          {scoreTooltips[field] || '暂无说明'}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
        </div>
      </div>
    </div>
  );

  const renderScoreInput = (field: string, maxScore: number, value: number, disabled: boolean = false) => (
    <div className="flex items-center space-x-2 bg-white px-2 py-1 rounded-lg border border-slate-200">
      <input
        type="number"
        min={0}
        max={maxScore}
        value={value || 0}
        onChange={(e) => updateScore(field, Math.min(maxScore, Math.max(0, Number(e.target.value))))}
        disabled={disabled}
        className={`w-12 bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none p-0 text-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      <div className="h-3 w-px bg-slate-200"></div>
      <span className="text-[10px] font-bold text-slate-400">{maxScore} 分</span>
    </div>
  );

  const renderSoftScoreInput = (
    prefix: string,
    title: string,
    maxScore: number,
    reasonField: string,
    conclusionField: string,
    scoreField: string,
    isRecommended: boolean,
    tooltipField?: string,
    canEditConclusionField: boolean = true,  // 是否可编辑评议结论
    canEditScoreField: boolean = true  // 是否可编辑得分
  ) => {
    const reason = editData.projectResult[reasonField] || '';
    const conclusion = editData.projectResult[conclusionField] || '';
    const score = editData.projectResult[scoreField] || 0;

    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
             <div className="w-6 h-6 bg-indigo-50 rounded flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <h5 className="text-sm font-bold text-slate-800">{title}</h5>
             {tooltipField && (
               <div className="relative group">
                 <svg className="w-3.5 h-3.5 text-slate-400 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-800 text-white text-[11px] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                   {scoreTooltips[tooltipField] || '暂无说明'}
                   <div className="absolute left-3 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                 </div>
               </div>
             )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">满分 {maxScore} 分</span>
        </div>

        {isRecommended && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5">推荐理由</label>
              <textarea
                value={reason}
                onChange={(e) => updateScore(reasonField, e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
                rows={2}
                placeholder="请输入理由..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">评议结论</label>
                <select
                  value={conclusion}
                  onChange={(e) => updateScore(conclusionField, e.target.value)}
                  disabled={!canEditConclusionField}
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none ${!canEditConclusionField ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <option value="">请选择</option>
                  <option value="通过">通过</option>
                  <option value="不通过">不通过</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">实际得分</label>
                <div className="h-9 flex items-center">
                  {renderScoreInput(scoreField, maxScore, score, !canEditScoreField)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-slate-900/40">
        <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-[1000px] h-[90vh] bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/40">
        {/* 头部 */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center space-x-4">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">{project.projectName}</h2>
                <div className="flex items-center space-x-2 mt-0.5">
                   <span className="text-[10px] font-bold text-white bg-slate-400 px-2 py-0.5 rounded-full">{project.projectCode}</span>
                   <span className="text-[10px] font-bold text-slate-400">项目成果详细评价</span>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab栏 */}
        <div className="px-8 bg-white border-b border-slate-200 flex space-x-4 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { key: 'basic', label: '基本信息' },
            { key: 'result', label: '成果展示' },
            { key: 'pmo_score', label: 'PMO评分' },
            { key: 'director_score', label: '区域总监评分' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`relative px-4 py-4 text-xs font-bold transition-colors ${
                activeTab === tab.key ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></div>
              )}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">项目编号</label>
                    <p className="text-base font-bold text-slate-800">{project.projectCode}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">项目名称</label>
                    <p className="text-base font-bold text-slate-800">{project.projectName}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">甲方单位</label>
                    <p className="text-base font-bold text-slate-800">{project.groupCompany}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">所属区域</label>
                    <p className="text-base font-bold text-slate-800">{project.region}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">行业</label>
                    <p className="text-base font-bold text-slate-800">{project.industry}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">密级</label>
                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold ${
                      project.securityLevel === '机密' ? 'bg-red-50 text-red-600 border border-red-100' :
                      project.securityLevel === '涉密' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                      'bg-slate-50 text-slate-600 border border-slate-100'
                    }`}>{project.securityLevel || '公开'}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">立项时间</label>
                    <p className="text-base font-bold text-slate-700">{project.kickoffDate}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">验收时间</label>
                    <p className="text-base font-bold text-emerald-600">{project.acceptanceDate}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">项目经理</label>
                    <p className="text-base font-bold text-slate-800">{project.projectManager}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">销售经理</label>
                    <p className="text-base font-bold text-slate-800">{project.salesManager}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">售前经理</label>
                    <p className="text-base font-bold text-slate-800">{project.preSalesManager}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4">评分结果汇总</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-indigo-50/50 rounded-2xl p-8 text-center border border-indigo-100">
                    <p className="text-xs font-bold text-indigo-400 uppercase mb-2">售前团队总得分</p>
                    <p className="text-5xl font-bold text-indigo-600 mb-3">{preSalesTotalScore}</p>
                    <span className="text-xs font-bold text-white bg-indigo-400 px-3 py-1 rounded-full">满分 120 分</span>
                  </div>
                  <div className="bg-emerald-50/50 rounded-2xl p-8 text-center border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-400 uppercase mb-2">实施团队总得分</p>
                    <p className="text-5xl font-bold text-emerald-600 mb-3">{implTotalScore}</p>
                    <span className="text-xs font-bold text-white bg-emerald-400 px-3 py-1 rounded-full">满分 120 分</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'result' && (
            <div className="space-y-10">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">模型成果库</h3>
                  <button onClick={addModelResult} className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700">添加模型</button>
                </div>
                {editData.modelResults.length > 0 ? (
                  <div className="space-y-4">
                    {editData.modelResults.map((model, index) => (
                      <div key={index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative">
                        <button onClick={() => removeModelResult(index)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <div className="grid grid-cols-3 gap-6 pr-10">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">模型名称</label>
                            <input type="text" value={model.modelName} onChange={(e) => updateModelResult(index, 'modelName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">应用场景</label>
                            <textarea value={model.problemScenario} onChange={(e) => updateModelResult(index, 'problemScenario', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none" rows={1} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">价值提炼</label>
                            <textarea value={model.valueExtraction} onChange={(e) => updateModelResult(index, 'valueExtraction', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none" rows={1} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-100 rounded-xl p-6 text-center border border-dashed border-slate-300">
                     <p className="text-xs font-bold text-slate-400">暂无模型成果物</p>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800">软件成果资产</h3>
                  <button onClick={addSoftwareResult} className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700">添加软件</button>
                </div>
                {editData.softwareResults.length > 0 ? (
                  <div className="space-y-4">
                    {editData.softwareResults.map((software, index) => (
                      <div key={index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative">
                        <button onClick={() => removeSoftwareResult(index)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <div className="grid grid-cols-3 gap-6 pr-10">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">软件名称</label>
                            <input type="text" value={software.softwareName} onChange={(e) => updateSoftwareResult(index, 'softwareName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">应用场景</label>
                            <textarea value={software.problemScenario} onChange={(e) => updateSoftwareResult(index, 'problemScenario', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none" rows={1} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1">价值提炼</label>
                            <textarea value={software.valueExtraction} onChange={(e) => updateSoftwareResult(index, 'valueExtraction', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none" rows={1} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-100 rounded-xl p-6 text-center border border-dashed border-slate-300">
                     <p className="text-xs font-bold text-slate-400">暂无软件成果物</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-800">SVN 地址</h3>
                  <input type="text" value={editData.svnAddress} onChange={(e) => setEditData(prev => ({ ...prev, svnAddress: e.target.value }))} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none" placeholder="输入 SVN 地址..." />
                  {editData.svnAddress && <button onClick={() => window.open(editData.svnAddress, '_blank')} className="w-full py-2.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-lg border border-indigo-100 uppercase tracking-widest">跳转至SVN</button>}
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800">材料提交情况</h3>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{editData.documentStatus.filter(d => d.isSubmitted).length} / {editData.documentStatus.length} 已完成</span>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                        <tr>
                          <th className="px-5 py-3 font-bold text-slate-400 w-12 text-center">序号</th>
                          <th className="px-5 py-3 font-bold text-slate-400">文档名称</th>
                          <th className="px-5 py-3 font-bold text-slate-400 text-center w-16">状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {editData.documentStatus.map((doc, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-400 text-center">{index + 1}</td>
                            <td className="px-5 py-3 font-bold text-slate-700">{doc.documentType}</td>
                            <td className="px-5 py-3 text-center">
                              <input type="checkbox" checked={doc.isSubmitted} onChange={(e) => updateDocumentStatus(index, e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pmo_score' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-slate-800">实施团队 - PMO 评分</h3>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">PMO 硬性评分指标</span>
                </div>
                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                  {[
                    { label: '进度控制-延期', field: 'implPmoHardDelay', max: 15 },
                    { label: '进度控制-节点', field: 'implPmoHardNode', max: 15 },
                    { label: '质量控制-材料提交', field: 'implPmoHardMaterial', max: 5 },
                    { label: '数字化执行指标', field: 'implPmoHardDigital', max: 10 },
                    { label: '成本控制情况', field: 'implPmoHardCost', max: 10 }
                  ].map(item => (
                    <div key={item.field} className="flex items-center justify-between pb-3 border-b border-slate-50">
                      {renderLabelWithTooltip(item.label, item.field)}
                      {renderScoreInput(item.field, item.max, editData.projectResult[item.field] || 0, !canEditPmoScore)}
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">PMO 硬性评分总计</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-bold text-slate-800 tabular-nums">{(editData.projectResult.implPmoHardDelay || 0) + (editData.projectResult.implPmoHardNode || 0) + (editData.projectResult.implPmoHardMaterial || 0) + (editData.projectResult.implPmoHardDigital || 0) + (editData.projectResult.implPmoHardCost || 0)}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">/ 55 分</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-slate-800">售前团队 - PMO 评分</h3>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">PMO 硬性评分指标</span>
                </div>
                <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                  {[
                    { label: '售前活动执行', field: 'preSalesPmoHardActivity', max: 10 },
                    { label: '数字化执行', field: 'preSalesPmoHardDigital', max: 5 },
                    { label: '团队投入评估', field: 'preSalesPmoHardInput', max: 15 }
                  ].map(item => (
                    <div key={item.field} className="flex items-center justify-between pb-3 border-b border-slate-50">
                      {renderLabelWithTooltip(item.label, item.field)}
                      {renderScoreInput(item.field, item.max, editData.projectResult[item.field] || 0, !canEditPmoScore)}
                    </div>
                  ))}
                </div>
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">PMO 硬性评分总计</span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-3xl font-bold text-slate-800 tabular-nums">{(editData.projectResult.preSalesPmoHardActivity || 0) + (editData.projectResult.preSalesPmoHardDigital || 0) + (editData.projectResult.preSalesPmoHardInput || 0)}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">/ 30 分</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'director_score' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-base font-bold text-slate-800">实施团队 - 总监评价</h3>
                   <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={editData.projectResult.implIsRecommended || false} onChange={(e) => updateScore('implIsRecommended', e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                      <span className="text-xs font-bold text-amber-600 uppercase">是否列为推荐</span>
                   </label>
                </div>
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center space-x-2 mb-4"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">总监硬性评价</span><div className="flex-1 h-px bg-slate-50"></div></div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                      {[
                        { label: '质量控制-满意度', field: 'implHardSatisfaction', max: 15 },
                        { label: '质量控制-交付物质量', field: 'implHardSubmitQuality', max: 10 },
                        { label: '需求控制情况', field: 'implHardRequirement', max: 10 },
                        { label: '风险控制情况', field: 'implHardRisk', max: 10 }
                      ].map(item => (
                        <div key={item.field} className="flex items-center justify-between pb-3 border-b border-slate-50">
                           {renderLabelWithTooltip(item.label, item.field)}
                           {renderScoreInput(item.field, item.max, editData.projectResult[item.field] || 0)}
                        </div>
                      ))}
                    </div>
                  </div>
                  {editData.projectResult.implIsRecommended && (
                    <div>
                        <div className="flex items-center space-x-2 mb-4"><span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">总监软性评价(推荐特有)</span><div className="flex-1 h-px bg-amber-50"></div></div>
                        <div className="grid gap-3">
                          {renderSoftScoreInput('impl', '技术提升情况', 8, 'implSoftTechReason', 'implSoftTechPmoConclusion', 'implSoftTechScore', true, 'implSoftTech', canEditConclusion, canEditConclusion)}
                          {renderSoftScoreInput('impl', '团队建设情况', 6, 'implSoftTeamReason', 'implSoftTeamPmoConclusion', 'implSoftTeamScore', true, 'implSoftTeam', canEditConclusion, canEditConclusion)}
                          {renderSoftScoreInput('impl', '成果积累情况', 6, 'implSoftResultReason', 'implSoftResultPmoConclusion', 'implSoftResultScore', true, 'implSoftResult', canEditConclusion, canEditConclusion)}
                        </div>
                    </div>
                  )}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-600 uppercase">实施团队合计得分</span>
                     <div className="flex items-baseline space-x-1.5">
                        <span className="text-3xl font-bold text-slate-800">{implTotalScore}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ 120 分</span>
                     </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-base font-bold text-slate-800">售前团队 - 总监评价</h3>
                   <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={editData.projectResult.preSalesIsRecommended || false} onChange={(e) => updateScore('preSalesIsRecommended', e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
                        <span className="text-xs font-bold text-amber-600 uppercase">是否列为推荐</span>
                      </label>
                   </div>
                </div>
                <div className="space-y-8">
                  <div>
                    <div className="flex items-center space-x-2 mb-4"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">总监硬性评价</span><div className="flex-1 h-px bg-slate-50"></div></div>
                    <div className="grid grid-cols-2 gap-x-10 gap-y-4">
                      {[
                        { label: '需求把控情况', field: 'preSalesHardRequirement', max: 30 },
                        { label: '售前方案质量', field: 'preSalesHardSolution', max: 25 },
                        { label: '风险识别情况', field: 'preSalesHardRisk', max: 15 }
                      ].map(item => (
                        <div key={item.field} className="flex items-center justify-between pb-3 border-b border-slate-50">
                           {renderLabelWithTooltip(item.label, item.field)}
                           {renderScoreInput(item.field, item.max, editData.projectResult[item.field] || 0)}
                        </div>
                      ))}
                    </div>
                  </div>
                  {editData.projectResult.preSalesIsRecommended && (
                    <div>
                        <div className="flex items-center space-x-2 mb-4"><span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">总监软性评价(推荐特有)</span><div className="flex-1 h-px bg-amber-50"></div></div>
                        <div className="grid gap-3">
                          {renderSoftScoreInput('preSales', '技术和产品牵引情况', 8, 'preSalesSoftTechReason', 'preSalesSoftTechPmoConclusion', 'preSalesSoftTechScore', true, 'preSalesSoftTech', canEditConclusion, canEditConclusion)}
                          {renderSoftScoreInput('preSales', '新方向拓展情况', 6, 'preSalesSoftDirectionReason', 'preSalesSoftDirectionPmoConclusion', 'preSalesSoftDirectionScore', true, 'preSalesSoftDirection', canEditConclusion, canEditConclusion)}
                          {renderSoftScoreInput('preSales', '成果推广情况', 6, 'preSalesSoftPromotionReason', 'preSalesSoftPromotionPmoConclusion', 'preSalesSoftPromotionScore', true, 'preSalesSoftPromotion', canEditConclusion, canEditConclusion)}
                        </div>
                    </div>
                  )}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-600 uppercase">售前团队合计得分</span>
                     <div className="flex items-baseline space-x-1.5">
                        <span className="text-3xl font-bold text-slate-800">{preSalesTotalScore}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">/ 120 分</span>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end space-x-4 px-8 py-5 border-t border-slate-200 bg-white shrink-0">
          <button onClick={onClose} className="px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase transition-colors">取消退出</button>
          <button onClick={handleSave} disabled={saving} className="px-10 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {saving ? '同步数据中...' : '提交保存评分'}
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
};

export default ProjectResultDetailModal;