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
      { text: '开始阅读', link: '/novels/zhuri/zhuri1' }, // 指向你的第一章
    ],

    // 侧边栏核心配置
    sidebar: [
      {
        text: '铸日', // 目录分组标题
        collapsed: false,      // 是否默认折叠
        items: [
          // 这里填你的文件名，link 对应文件路径（不需要写 .md）
          { text: '一', link: '/novels/zhuri/zhuri1' },
          { text: '二', link: '/novels/zhuri/zhuri2' },
          { text: '三', link: '/novels/zhuri/zhuri3' },
          { text: '四', link: '/novels/zhuri/zhuri4' },
        ]
      },
      {
        text: '时间魔法', // 目录分组标题
        collapsed: false,      // 是否默认折叠
        items: [
          // 这里填你的文件名，link 对应文件路径（不需要写 .md）
          { text: '一', link: '/novels/timemagic/timemagic1' },
          { text: '二', link: '/novels/timemagic/timemagic2' },
          { text: '三', link: '/novels/timemagic/timemagic3' },
          { text: '四', link: '/novels/timemagic/timemagic4' },
        ]
      },
      { 
  text: '月神demo', 
  link: '/artemis-demo2.html',
  // 强制浏览器将其视为外部链接或独立页面
  target: '_self', 
  rel: 'noopener'
}
    ],

    // 社交链接图标
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yanzhao1027' }
    ]
  }
})