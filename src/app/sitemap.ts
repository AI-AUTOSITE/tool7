// sitemap.xml生成（src/app/sitemap.ts）
export default function sitemap() {
  return [
    {
      url: 'https://tool7.ai-autosite.com',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}

// robots.txt（src/app/robots.ts）
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://tool7.ai-autosite.com/sitemap.xml',
  }
}