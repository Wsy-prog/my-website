"use client";

import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { GlassCard } from "@/components/shared/GlassCard";
import { GradientText } from "@/components/shared/GradientText";
import { Badge } from "@/components/ui/badge";
import { Download, Award, User, MapPin, Calendar, Mail, GraduationCap, Briefcase, Globe, Wrench } from "lucide-react";
import { awardCategories } from "@/data/awards";

const personalInfo = {
  name: "王舒毅",
  age: "21",
  gender: "男",
  hometown: "海南省文昌市",
  location: "安徽省合肥市",
  email: "1753793278@qq.com / wsy541541@mail.ustc.edu.cn",
  phone: "18907506952",
  qq: "1753793278",
};

const education = [
  { school: "中国科学技术大学", degree: "工程科学学院 学士", period: "2023 — 至今", description: "工程科学学院，工程热物理，能源与动力工程。" },
  { school: "海南省文昌中学", degree: "高中", period: "2020 — 2023", description: "理科方向。" },
  { school: "海南省文昌中学", degree: "初中", period: "2017 — 2020", description: "" },
  { school: "海南省文昌市会文镇烟墩小学", degree: "小学", period: "2011 — 2017", description: "" },
];

const exchange = [
  { institution: "澳大利亚（悉尼大学、墨尔本大学、伍伦贡大学）", program: "暑期学术交流", period: "2025.08.02 — 2025.08.17", description: "赴澳大利亚参加暑期学术交流项目，参访多所高校实验室与科研团队。" },
  { institution: "香港理工大学、香港科技大学、香港大学", program: "学术参访", period: "2025.07", description: "赴香港参访三所高校，了解科研前沿与学术环境。" },
  { institution: "中国科学院广州能源所", program: "科研实践", period: "2025.07", description: "参与能源领域科研实践。" },
  { institution: "东莞新能源研究院", program: "参观学习", period: "2024.11.23", description: "参观新能源研究院，了解产业前沿技术。" },
];

const experience = [
  { company: "中国科学技术大学", role: "本科生科研", period: "2024 — 至今", description: "在<a href='https://faculty.ustc.edu.cn/chengwenlong/zh_CN/index/994636/list/index.htm' target='_blank' rel='noopener noreferrer' class='text-primary font-semibold hover:underline'>程文龙教授</a>课题组参与工程热物理相关研究工作。" },
  { company: "全国大学生智能车竞赛", role: "参赛队员", period: "2024.10 — 2025.07", description: "参加第20届全国大学生智能车竞赛，负责硬件设计与调试。" },
];

const socialExperience = [
  { organization: "文昌市\"育梦沃新，微以致远\"暑期爱心支教", role: "支教志愿者", period: "2024.07", description: "参与暑期爱心支教活动。" },
  { organization: "文昌市\"青衿之志、履践致远\"暑假中学交流会", role: "负责人兼主讲人", period: "2024.07", description: "主讲学校：文昌中学、文昌市华侨中学、文昌市清华附中。" },
  { organization: "文昌市\"青衿之志、履践致远\"寒假中学交流会", role: "负责人", period: "2024.01", description: "负责组织寒假交流会，学校：文昌中学、文昌市华侨中学。" },
  { organization: "文昌市\"青衿之志、履践致远\"暑假中学交流会", role: "主讲人", period: "2023.07", description: "主讲学校：文昌中学、文昌市华侨中学。" },
];

const skills = [
  { name: "科研", tags: ["实验设计", "数据分析", "论文写作"] },
  { name: "C/Python/AI", tags: ["数据处理", "机器学习", "自动化脚本"] },
  { name: "电路板设计/焊接", tags: ["PCB设计", "焊接", "嘉立创"] },
  { name: "CAD/Solidworks", tags: ["3D建模", "工程制图", "装配设计"] },
  { name: "3D建模/打印", tags: ["模型设计", "机器使用", "后处理"] },
  { name: "中学学业辅导", tags: ["语数物化地", "学习方法", "分数提升", "升学规划"] },
];

const hobbies = [
  "运动（乒乓球、羽毛球、游泳、台球）",
  "摄影/剪辑",
  "骑行",
  "游戏",
  "品茶",
  "美食",
  "旅游",
  "阅读",
  "公益活动",
  "学习新事物",
];

export default function ResumePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <AnimatedSection className="text-center mb-16">
        <GradientText as="h1" className="text-4xl sm:text-5xl font-bold mb-4">我的简历</GradientText>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">个人信息、教育经历、获奖情况与技能</p>
        <a
          href="/resume.tex"
          download
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium border border-purple-400/40 bg-purple-500/5 text-purple-500 hover:bg-purple-500/10 hover:border-purple-400/60 transition-all"
        >
          <Download className="h-4 w-4" /> 下载 LaTeX 简历
        </a>
      </AnimatedSection>

      {/* 个人信息 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <User className="h-6 w-6" /> 个人信息
        </h2>
        <GlassCard>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* 证件照 */}
            <div className="shrink-0">
              <div className="w-32 h-40 rounded-xl overflow-hidden border-2 border-border bg-muted">
                <img
                  src="/images/id-photo.jpg"
                  alt="证件照"
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">姓名</span><p className="font-medium">{personalInfo.name}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">年龄</span><p className="font-medium">{personalInfo.age}岁</p></div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">性别</span><p className="font-medium">{personalInfo.gender}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">籍贯</span><p className="font-medium">{personalInfo.hometown}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">现居</span><p className="font-medium">{personalInfo.location}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><span className="text-xs text-muted-foreground">邮箱</span><p className="font-medium text-sm">{personalInfo.email}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              <div><span className="text-xs text-muted-foreground">手机</span><p className="font-medium">{personalInfo.phone}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              <div><span className="text-xs text-muted-foreground">QQ</span><p className="font-medium">{personalInfo.qq}</p></div>
            </div>
            </div>
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* 教育经历 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> 教育经历
        </h2>
        <div className="space-y-4">
          {education.map((item, i) => (
            <GlassCard key={item.school} delay={i * 0.1}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-lg font-semibold">{item.school}</h3>
                <span className="text-sm text-muted-foreground">{item.period}</span>
              </div>
              <p className="text-primary font-medium mb-1">{item.degree}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </AnimatedSection>

      {/* 交流经历 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Globe className="h-6 w-6" /> 交流经历
        </h2>
        <div className="space-y-4">
          {exchange.map((item, i) => (
            <GlassCard key={item.institution} delay={i * 0.1}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-lg font-semibold">{item.institution}</h3>
                <span className="text-sm text-muted-foreground">{item.period}</span>
              </div>
              <p className="text-primary font-medium mb-1">{item.program}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </AnimatedSection>

      {/* 工作/科研经历 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Briefcase className="h-6 w-6" /> 科研与工作经历
        </h2>
        <div className="space-y-4">
          {experience.length === 0 ? (
            <GlassCard><p className="text-muted-foreground text-center py-4">暂无</p></GlassCard>
          ) : (
            experience.map((item, i) => (
            <GlassCard key={item.company} delay={i * 0.1}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-lg font-semibold">{item.company}</h3>
                <span className="text-sm text-muted-foreground">{item.period}</span>
              </div>
              <p className="text-primary font-medium mb-1">{item.role}</p>
              <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: item.description }} />
            </GlassCard>
          ))
          )}
        </div>
      </AnimatedSection>

      {/* 社会经历 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🤝 社会经历
        </h2>
        <div className="space-y-4">
          {socialExperience.map((item, i) => (
            <GlassCard key={item.organization} delay={i * 0.1}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <h3 className="text-lg font-semibold">{item.organization}</h3>
                <span className="text-sm text-muted-foreground">{item.period}</span>
              </div>
              <p className="text-primary font-medium mb-1">{item.role}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </GlassCard>
          ))}
        </div>
      </AnimatedSection>

      {/* 获奖情况 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-500" /> 获奖情况
        </h2>
        {awardCategories.map((category, ci) => (
          <div key={category.label} className={ci < awardCategories.length - 1 ? "mb-8" : ""}>
            <h3 className="text-lg font-semibold mb-4">{category.label}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {category.items.map((award, i) => (
                <GlassCard key={award.title} delay={i * 0.05}>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Award className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{award.title}</h4>
                      <p className="text-xs text-muted-foreground">{award.date}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}
      </AnimatedSection>

      {/* 技能 */}
      <AnimatedSection className="mb-16">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Wrench className="h-6 w-6" /> 技能
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {skills.map((skill, i) => (
            <GlassCard key={skill.name} delay={i * 0.1}>
              <h3 className="font-semibold mb-2">{skill.name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {skill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </AnimatedSection>

      {/* 爱好 */}
      <AnimatedSection>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          ❤️ 爱好
        </h2>
        <GlassCard>
          <div className="flex flex-wrap gap-3">
            {hobbies.map((hobby) => (
              <Badge key={hobby} variant="outline" className="px-4 py-2 text-base rounded-full hover:bg-primary/10 transition-colors cursor-default">
                {hobby}
              </Badge>
            ))}
          </div>
        </GlassCard>
      </AnimatedSection>
    </div>
  );
}
