import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "赵岩｜个人小站",
  description: "于是我仍旧栽种玫瑰。",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    
    // 顶部导航栏（可选）
    nav: [
      { text: '首页', link: '/' },
      { text: '开始阅读', link: '/novels/小说《铸日》' } // 指向你的第一章
    ],

    // 侧边栏核心配置
    sidebar: [
      {
        text: '幻想造物', // 目录分组标题
        collapsed: false,      // 是否默认折叠
        items: [
          // 这里填你的文件名，link 对应文件路径（不需要写 .md）
          { text: '一 铸日', link: '/novels/小说《铸日》' },
          { text: '二 时间', link: '/novels/时间魔法' },
        ]
      }
    ],

    // 社交链接图标
    socialLinks: [
      { icon: 'github', link: 'https://github.com/你的githubID' }
    ]
  }
})