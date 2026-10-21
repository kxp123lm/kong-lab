export interface Project {
  id: string; name: string; subtitle: string; description: string;
  category: '小游戏' | 'AI 工具' | '实验项目'; date: string | null;
  status: '可以玩了' | '筹备中'; cover?: string; href?: string; github?: string;
  theme: 'melon' | 'terminal' | 'orbit';
}
// 添加作品只需新增一个配置。筹备项目没有虚构日期、演示链接或仓库。
export const projects: Project[] = [
  {id:'xiaomin',name:'合成大西瓜',subtitle:'THE ORIGINAL, RECONNECTED.',description:'熟悉的掉落，意料之外的合成。原版 Cocos 小游戏，现在有了联网排行榜。',category:'小游戏',date:'2022',status:'可以玩了',cover:'/cocos/res/share.jpg',href:'/game',github:'https://github.com/kxp123lm/xiaomin',theme:'melon'},
  {id:'ai-tool',name:'下一个灵感',subtitle:'AN IDEA IS TAKING SHAPE.',description:'准备把日常的小麻烦，变成一个顺手的 AI 工具。还在构思，敬请期待。',category:'AI 工具',date:null,status:'筹备中',theme:'terminal'},
  {id:'experiment',name:'未命名实验',subtitle:'ROOM FOR SOMETHING WEIRD.',description:'给好奇心留一个位置。新的交互、新的玩法，也可能只是一个有趣的念头。',category:'实验项目',date:null,status:'筹备中',theme:'orbit'},
];
