import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// レート制限用のメモリストア（本番環境ではRedisなどを使用推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// レート制限チェック
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = parseInt(process.env.MAX_DAILY_LIMIT || '50')
  
  const userLimit = rateLimitStore.get(ip)
  
  if (!userLimit || userLimit.resetTime < now) {
    // 新規または期限切れ
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + 24 * 60 * 60 * 1000 // 24時間後
    })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // IPアドレス取得（Vercelの場合）
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // レート制限チェック
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Daily limit reached. Please try again tomorrow.' },
        { status: 429 }
      )
    }
    
    // フォームデータ取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }
    
    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      )
    }
    
    // 画像をBase64に変換
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString('base64')
    
    // Google Vision APIの呼び出し
    const visionResponse = await callGoogleVisionAPI(base64Image)
    
    // GPTによる個人情報判定
    const sensitiveWords = await analyzeSensitiveInfo(visionResponse.texts)
    
    // 境界ボックス生成
    const boxes = generateBoundingBoxes(visionResponse.annotations, sensitiveWords)
    
    return NextResponse.json({
      boxes,
      detected: sensitiveWords.length,
      message: `Found ${sensitiveWords.length} sensitive regions`
    })
    
  } catch (error: any) {
    console.error('Detection error:', error)
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Google Vision API呼び出し
async function callGoogleVisionAPI(base64Image: string) {
  const apiKey = process.env.GOOGLE_API_KEY
  
  if (!apiKey) {
    throw new Error('Google Vision API key not configured')
  }
  
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50
            },
            {
              type: 'FACE_DETECTION',
              maxResults: 10
            }
          ]
        }]
      })
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Vision API error: ${error}`)
  }
  
  const data = await response.json()
  const result = data.responses[0]
  
  return {
    texts: result.textAnnotations || [],
    faces: result.faceAnnotations || [],
    annotations: result.textAnnotations || []
  }
}

// GPTによる個人情報分析
async function analyzeSensitiveInfo(texts: any[]): Promise<string[]> {
  if (!texts || texts.length === 0) {
    return []
  }
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    // APIキーがない場合は簡易的なパターンマッチング
    return simpleSensitiveDetection(texts)
  }
  
  // テキスト抽出（最初の要素は全文なので除外）
  const words = texts.slice(1).map(t => t.description).filter(Boolean)
  
  if (words.length === 0) {
    return []
  }
  
  const openai = new OpenAI({ apiKey })
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト削減のためminiモデル使用
      messages: [
        {
          role: 'system',
          content: 'You are a privacy expert. Identify personal information, sensitive data, emails, phone numbers, addresses, names, ID numbers, and any potentially private information. Return ONLY the exact words that should be masked, one per line.'
        },
        {
          role: 'user',
          content: `From this list of text, identify sensitive information that should be masked:\n${words.join(', ')}\n\nReturn only exact matches from the list, one per line.`
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })
    
    const result = completion.choices[0].message.content || ''
    
    // 改行で分割して配列化
    const sensitiveWords = result
      .split(/[\n,]/)
      .map(w => w.trim())
      .filter(w => w.length > 0)
    
    return sensitiveWords
    
  } catch (error) {
    console.error('GPT API error:', error)
    // エラー時は簡易検出にフォールバック
    return simpleSensitiveDetection(texts)
  }
}

// 簡易的な個人情報検出（フォールバック用）
function simpleSensitiveDetection(texts: any[]): string[] {
  const sensitive: string[] = []
  
  // パターン定義
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d\-\(\)\+\s]{7,}$/,
    ssn: /^\d{3}-\d{2}-\d{4}$/,
    creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/,
    url: /^https?:\/\//i,
    ipAddress: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
  }
  
  // 名前っぽい単語（大文字始まり）
  const namePattern = /^[A-Z][a-z]+$/
  
  texts.slice(1).forEach(annotation => {
    const text = annotation.description
    if (!text) return
    
    // パターンマッチング
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        sensitive.push(text)
        return
      }
    }
    
    // 名前の可能性
    if (namePattern.test(text)) {
      sensitive.push(text)
    }
    
    // 特定のキーワード
    const keywords = ['password', 'secret', 'private', 'confidential', 'ssn', 'id', 'account']
    if (keywords.some(kw => text.toLowerCase().includes(kw))) {
      sensitive.push(text)
    }
  })
  
  return sensitive
}

// 境界ボックス生成
function generateBoundingBoxes(annotations: any[], sensitiveWords: string[]) {
  const boxes: any[] = []
  
  if (!annotations || annotations.length === 0) {
    return boxes
  }
  
  // 顔検出結果も追加する場合はここに実装
  
  // テキストアノテーションから境界ボックス生成
  annotations.slice(1).forEach((annotation, index) => {
    const text = annotation.description
    
    // 個人情報として検出された単語かチェック
    const isSensitive = sensitiveWords.some(word => {
      return text && (
        text === word ||
        text.toLowerCase() === word.toLowerCase() ||
        text.includes(word) ||
        word.includes(text)
      )
    })
    
    if (isSensitive && annotation.boundingPoly) {
      const vertices = annotation.boundingPoly.vertices
      
      if (vertices && vertices.length >= 4) {
        // 座標計算（負の値を防ぐ）
        const x = Math.max(0, vertices[0].x || 0)
        const y = Math.max(0, vertices[0].y || 0)
        const width = Math.max(1, (vertices[1].x || 0) - x)
        const height = Math.max(1, (vertices[2].y || 0) - y)
        
        boxes.push({
          x,
          y,
          width,
          height,
          text,
          confidence: 0.9 // 信頼度（仮の値）
        })
      }
    }
  })
  
  return boxes
}