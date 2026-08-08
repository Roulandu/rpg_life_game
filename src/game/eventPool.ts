import type { GameEvent } from './types'

export const DEFAULT_EVENT_POOL: GameEvent[] = [
  // ── 童年 ──────────────────────────────────────────────
  {
    id: 'childhood-learn-to-read',
    stage: 'childhood',
    title: '学认字',
    description: '父母开始教你认字，你好奇地翻着书。',
    weight: 3,
    options: [
      { label: '认真学', effect: { attributes: { intelligence: 10 } } },
      { label: '边玩边学', effect: { attributes: { intelligence: 5, charm: 2 } } },
    ],
  },
  {
    id: 'childhood-outdoor-play',
    stage: 'childhood',
    title: '户外玩耍',
    description: '邻居小孩喊你出去玩。',
    weight: 2,
    options: [
      { label: '出去玩', effect: { attributes: { physique: 8, charm: 3 } } },
      { label: '在家看书', effect: { attributes: { intelligence: 6 } } },
    ],
  },
  {
    id: 'childhood-illness',
    stage: 'childhood',
    title: '生病了',
    description: '换季时你发烧了，只能卧床休息。',
    weight: 1,
    options: [
      { label: '乖乖休息', effect: { attributes: { physique: 4, intelligence: -3 } } },
      { label: '硬撑去玩', effect: { attributes: { physique: -8, charm: 2 } } },
    ],
  },
  {
    id: 'childhood-pet',
    stage: 'childhood',
    title: '养宠物',
    description: '你想养一只小狗，父母在犹豫。',
    weight: 1,
    options: [
      { label: '用心照顾', effect: { attributes: { charm: 6, physique: 3 } } },
      { label: '嫌麻烦放弃', effect: { attributes: { charm: -2 } } },
    ],
  },
  {
    id: 'childhood-asking',
    stage: 'childhood',
    title: '十万个为什么',
    description: '你对世界充满好奇，缠着大人问个不停。',
    weight: 2,
    options: [
      { label: '追根究底', effect: { attributes: { intelligence: 8, charm: 2 } } },
      { label: '转头去玩', effect: { attributes: { physique: 4 } } },
    ],
  },
  {
    id: 'childhood-music',
    stage: 'childhood',
    title: '学一门乐器',
    description: '父母问你想不想学一门乐器。',
    weight: 1,
    options: [
      { label: '坚持练习', effect: { attributes: { intelligence: 5, charm: 5 } } },
      { label: '三天打鱼', effect: { attributes: { charm: 2 } } },
    ],
  },
  {
    id: 'childhood-chores',
    stage: 'childhood',
    title: '帮家里做事',
    description: '大人希望你分担一些家务。',
    weight: 1,
    options: [
      { label: '主动帮忙', effect: { attributes: { charm: 4, physique: 3 } } },
      { label: '偷懒耍赖', effect: { attributes: { charm: -3 } } },
    ],
  },

  // ── 求学 ──────────────────────────────────────────────
  {
    id: 'education-study-hard',
    stage: 'education',
    title: '备考冲刺',
    description: '重要考试临近，你需要取舍。',
    weight: 3,
    options: [
      { label: '熬夜刷题', effect: { attributes: { intelligence: 15, physique: -8 } } },
      { label: '劳逸结合', effect: { attributes: { intelligence: 9, physique: 2 } } },
      { label: '出去放松', effect: { attributes: { charm: 6 } } },
    ],
  },
  {
    id: 'education-social',
    stage: 'education',
    title: '社团活动',
    description: '学校社团招新，你想参加吗？',
    weight: 2,
    options: [
      { label: '加入社团', effect: { attributes: { charm: 8 } } },
      { label: '专心学习', effect: { attributes: { intelligence: 7 } } },
    ],
  },
  {
    id: 'education-prestige-school',
    stage: 'education',
    title: '名校橄榄枝',
    description: '你的成绩异常出色，有机会进入顶尖学府。',
    weight: 1,
    requires: { attributes: { intelligence: 70 } },
    options: [
      { label: '接受挑战', effect: { attributes: { intelligence: 15 }, milestones: ['prestige-school'] } },
      { label: '留在本地上学', effect: { attributes: { charm: 5 }, wealth: 10 } },
    ],
  },
  {
    id: 'education-sports',
    stage: 'education',
    title: '运动会',
    description: '一年一度的校运动会开始了。',
    weight: 1,
    options: [
      { label: '报名参赛', effect: { attributes: { physique: 10 } } },
      { label: '当拉拉队', effect: { attributes: { charm: 6 } } },
      { label: '在教室自习', effect: { attributes: { intelligence: 6 } } },
    ],
  },
  {
    id: 'education-parttime',
    stage: 'education',
    title: '课余兼职',
    description: '有份零工机会，能补贴零花钱。',
    weight: 1,
    options: [
      { label: '打工赚钱', effect: { wealth: 30, attributes: { physique: -4 } } },
      { label: '专心学业', effect: { attributes: { intelligence: 6 } } },
    ],
  },
  {
    id: 'education-crush',
    stage: 'education',
    title: '心动时刻',
    description: '你好像对某个同学有了不一样的感觉。',
    weight: 1,
    options: [
      { label: '鼓起勇气', effect: { attributes: { charm: 8 } } },
      { label: '藏在心里', effect: { attributes: { charm: -3, intelligence: 3 } } },
    ],
  },
  {
    id: 'education-competition',
    stage: 'education',
    title: '学科竞赛',
    description: '学校组织学科竞赛，你跃跃欲试。',
    weight: 1,
    options: [
      { label: '全力备战', effect: { attributes: { intelligence: 12, physique: -4 } } },
      { label: '重在参与', effect: { attributes: { intelligence: 5, charm: 2 } } },
    ],
  },
  {
    id: 'education-volunteer',
    stage: 'education',
    title: '社区志愿者',
    description: '社区招募青少年志愿者。',
    weight: 1,
    options: [
      { label: '报名服务', effect: { attributes: { charm: 7 }, milestones: ['volunteered'] } },
      { label: '婉言谢绝', effect: { attributes: { charm: -2 } } },
    ],
  },

  // ── 工作 ──────────────────────────────────────────────
  {
    id: 'career-job-promotion',
    stage: 'career',
    title: '晋升机会',
    description: '公司出现晋升机会，竞争激烈。',
    weight: 2,
    options: [
      { label: '积极争取', effect: { attributes: { charm: 6 }, wealth: 60 } },
      { label: '默默耕耘', effect: { attributes: { intelligence: 5 }, wealth: 30 } },
    ],
  },
  {
    id: 'career-investment',
    stage: 'career',
    title: '投资理财',
    description: '朋友推荐了一个理财项目，收益与风险并存。',
    weight: 2,
    options: [
      { label: '大胆投入', effect: { wealth: 120 } },
      { label: '保守储蓄', effect: { wealth: 30 } },
      { label: '不碰为妙', effect: { wealth: 0 } },
    ],
  },
  {
    id: 'career-overtime',
    stage: 'career',
    title: '加班赶工',
    description: '项目临近交付，需要加班。',
    weight: 3,
    options: [
      { label: '全力加班', effect: { wealth: 40, attributes: { physique: -8 } } },
      { label: '按时下班', effect: { attributes: { physique: 4, charm: 2 } } },
    ],
  },
  {
    id: 'career-reskill',
    stage: 'career',
    title: '进修充电',
    description: '你考虑利用业余时间学习新技能。',
    weight: 1,
    options: [
      { label: '报名进修', effect: { attributes: { intelligence: 10 }, wealth: -20, milestones: ['studied'] } },
      { label: '维持现状', effect: { wealth: 10 } },
    ],
  },
  {
    id: 'career-vip-network',
    stage: 'career',
    title: '高端社交圈',
    description: '凭借你的声望与实力，你被邀请进入一个精英人脉圈。',
    weight: 1,
    requires: { attributes: { charm: 70 }, wealth: 150 },
    options: [
      { label: '积极拓展', effect: { attributes: { charm: 6 }, wealth: 80, milestones: ['vip-network'] } },
      { label: '低调婉拒', effect: { attributes: { charm: -4 } } },
    ],
  },
  {
    id: 'career-startup',
    stage: 'career',
    title: '创业冲动',
    description: '有个创业点子在你脑海中挥之不去。',
    weight: 1,
    options: [
      { label: '放手一搏', effect: { wealth: 200, attributes: { physique: -6 }, milestones: ['started-business'] } },
      { label: '安于现状', effect: { wealth: 20 } },
    ],
  },
  {
    id: 'career-job-change',
    stage: 'career',
    title: '跳槽机会',
    description: '另一家公司向你抛出了橄榄枝。',
    weight: 1,
    options: [
      { label: '接受新挑战', effect: { wealth: 60, attributes: { charm: 4 } } },
      { label: '留守原职', effect: { attributes: { intelligence: 4 }, wealth: 20 } },
    ],
  },
  {
    id: 'career-property',
    stage: 'career',
    title: '置业安家',
    description: '你考虑购置一套房产，稳定下来。',
    weight: 1,
    requires: { wealth: 150 },
    options: [
      { label: '贷款买房', effect: { wealth: -100, attributes: { charm: 5 }, milestones: ['homeowner'] } },
      { label: '继续租房', effect: { wealth: 20 } },
    ],
  },

  // ── 晚年 ──────────────────────────────────────────────
  {
    id: 'elderly-hobby',
    stage: 'elderly',
    title: '晚年爱好',
    description: '退休后你有了大把时间。',
    weight: 3,
    options: [
      { label: '含饴弄孙', effect: { attributes: { charm: 8 } } },
      { label: '锻炼身体', effect: { attributes: { physique: 6 } } },
      { label: '读书看报', effect: { attributes: { intelligence: 5 } } },
    ],
  },
  {
    id: 'elderly-care',
    stage: 'elderly',
    title: '身体保养',
    description: '你开始关注健康。',
    weight: 2,
    options: [
      { label: '定期体检', effect: { attributes: { physique: 5 }, wealth: -10 } },
      { label: '顺其自然', effect: { attributes: { physique: -3 } } },
    ],
  },
  {
    id: 'elderly-reunion',
    stage: 'elderly',
    title: '老友重逢',
    description: '多年不见的老友约你叙旧。',
    weight: 1,
    options: [
      { label: '欣然赴约', effect: { attributes: { charm: 7 } } },
      { label: '婉言谢绝', effect: { attributes: { charm: -4 } } },
    ],
  },
  {
    id: 'elderly-teaching',
    stage: 'elderly',
    title: '传承经验',
    description: '社区的年轻人想向你请教人生经验。',
    weight: 1,
    options: [
      { label: '倾囊相授', effect: { attributes: { intelligence: 5, charm: 5 } } },
      { label: '低调婉拒', effect: { attributes: { charm: 2 } } },
    ],
  },
  {
    id: 'elderly-travel',
    stage: 'elderly',
    title: '环游世界',
    description: '你一直有个周游世界的愿望。',
    weight: 1,
    requires: { wealth: 80 },
    options: [
      { label: '潇洒出发', effect: { wealth: -60, attributes: { charm: 6, physique: 3 } } },
      { label: '居家安逸', effect: { attributes: { charm: 2 } } },
    ],
  },
  {
    id: 'elderly-memoir',
    stage: 'elderly',
    title: '写下回忆录',
    description: '你想把这一生的故事记录下来。',
    weight: 1,
    options: [
      { label: '认真动笔', effect: { attributes: { intelligence: 6, charm: 3 }, milestones: ['memoir'] } },
      { label: '口述给家人', effect: { attributes: { charm: 5 } } },
    ],
  },
]
