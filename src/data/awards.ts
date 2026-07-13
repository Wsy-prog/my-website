// 获奖情况数据 —— 在这里增删改奖项
// 按分类组织，每个分类下的奖项按时间降序排列

export interface AwardItem {
  title: string;
  date: string;
}

export interface AwardCategory {
  label: string;  // 如 "🎓 学业"
  items: AwardItem[];
}

export const awardCategories: AwardCategory[] = [
  {
    label: "🎓 学业",
    items: [
      { title: "全国大学生第20届智能车竞赛安徽赛区省级三等奖", date: "2025" },
      { title: "优秀学生奖学金铜奖", date: "2025" },
      { title: "吴仲华英才班奖学金金奖", date: "2024" },
      { title: "远见奖学金", date: "2024" },
      { title: "优秀学生奖学金铜奖", date: "2024" },
      { title: "优秀学生奖学金银奖", date: "2023" },
    ],
  },
  {
    label: "🏓 体育",
    items: [
      { title: "中国科学技术大学2026年度乒乓球\"会员大赛\"十六强", date: "2026" },
      { title: "中国科学技术大学\"四国大战\"乒乓球赛季军", date: "2024" },
      { title: "中国科学技术大学第十七届\"继往开来杯\"乒乓球单打比赛八强", date: "2024" },
      { title: "中国科学技术大学第六届\"乒水相逢杯\"乒乓球双打比赛十六强", date: "2024" },
      { title: "第四届工程科学学院\"团结力行\"拔河比赛优秀奖", date: "2024" },
      { title: "2024年度《国家学生体质健康标准》测试优秀奖", date: "2024" },
      { title: "2023年度《国家学生体质健康标准》测试优秀奖", date: "2023" },
    ],
  },
  {
    label: "🤝 社会公益",
    items: [
      { title: "美在心灵\"奋楫笃行，臻于至善\"寒期中学交流会优秀工作人员", date: "2024" },
    ],
  },
];
