'use client'

import { useState, useRef, useEffect } from 'react'
import { Upload, Download, RotateCcw, Undo2, Shield, AlertCircle, CheckCircle } from 'lucide-react'

// マスク領域の型定義
interface MaskRegion {
  x: number
  y: number
  width: number
  height: number
  text?: string
  id: string
}

export default function HomePage() {
  // 状態管理
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [detectedRegions, setDetectedRegions] = useState<MaskRegion[]>([])
  const [maskedRegions, setMaskedRegions] = useState<MaskRegion[]>([])
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  
  // Canvas参照
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 元画像を保存
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)

  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    // ファイルサイズチェック（5MB制限）
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      return
    }
    
    // ファイルタイプチェック
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }
    
    setFile(selectedFile)
    setError('')
    setSuccessMessage('')
    
    // 画像プレビュー生成
    const url = URL.createObjectURL(selectedFile)
    setImageUrl(url)
    
    // 画像サイズ取得
    const img = new Image()
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      setOriginalImage(img)
      drawCanvas(img, [])
    }
    img.src = url
  }

  // Canvas描画
  const drawCanvas = (img: HTMLImageElement, masks: MaskRegion[]) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Canvasサイズ設定
    canvas.width = img.width
    canvas.height = img.height
    
    // 元画像描画
    ctx.drawImage(img, 0, 0)
    
    // マスク適用
    masks.forEach(mask => {
      ctx.fillStyle = 'rgba(0, 0, 0, 1)'
      ctx.fillRect(mask.x, mask.y, mask.width, mask.height)
    })
  }

  // AI検出処理
  const handleDetection = async () => {
    if (!file) {
      setError('Please select an image first')
      return
    }
    
    setIsProcessing(true)
    setError('')
    setSuccessMessage('')
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/detect', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Detection failed')
      }
      
      const data = await response.json()
      
      // 検出結果をIDを付けて保存
      const regionsWithId = data.boxes.map((box: any, index: number) => ({
        ...box,
        id: `region-${Date.now()}-${index}`
      }))
      
      setDetectedRegions(regionsWithId)
      setSuccessMessage(`Detected ${regionsWithId.length} sensitive regions`)
      
    } catch (err: any) {
      setError(err.message || 'Failed to detect sensitive information')
    } finally {
      setIsProcessing(false)
    }
  }

  // 領域クリックでマスク適用
  const handleRegionClick = (region: MaskRegion) => {
    // マスク済みリストに追加
    setMaskedRegions([...maskedRegions, region])
    
    // 検出リストから削除
    setDetectedRegions(detectedRegions.filter(r => r.id !== region.id))
    
    // Canvas再描画
    if (originalImage) {
      drawCanvas(originalImage, [...maskedRegions, region])
    }
  }

  // 元に戻す
  const handleUndo = () => {
    if (maskedRegions.length === 0) return
    
    const lastMasked = maskedRegions[maskedRegions.length - 1]
    
    // マスク済みから削除
    setMaskedRegions(maskedRegions.slice(0, -1))
    
    // 検出リストに戻す
    setDetectedRegions([...detectedRegions, lastMasked])
    
    // Canvas再描画
    if (originalImage) {
      drawCanvas(originalImage, maskedRegions.slice(0, -1))
    }
  }

  // リセット
  const handleReset = () => {
    setMaskedRegions([])
    setDetectedRegions([])
    
    if (originalImage) {
      drawCanvas(originalImage, [])
    }
  }

  // ダウンロード
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.toBlob((blob) => {
      if (!blob) return
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `masked-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    })
    
    setSuccessMessage('Image downloaded successfully!')
  }

  // コンテナサイズに合わせたスケール計算
  const getScaledDimensions = () => {
    if (!containerRef.current || imageSize.width === 0) {
      return { width: '100%', height: 'auto', scale: 1 }
    }
    
    const containerWidth = containerRef.current.offsetWidth
    const scale = Math.min(1, containerWidth / imageSize.width)
    
    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale,
      scale
    }
  }

  const scaled = getScaledDimensions()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-primary-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                BlurTap
              </h1>
            </div>
            <p className="text-sm text-gray-600 hidden sm:block">
              AI-Powered Privacy Protection
            </p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* アップロードセクション */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Upload Image to Protect Privacy
            </h2>
            
            {/* ファイル選択エリア */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md mx-auto border-2 border-dashed border-primary-300 rounded-xl p-8 hover:border-primary-500 hover:bg-primary-50 transition-all duration-300 group"
              >
                <Upload className="w-12 h-12 mx-auto text-primary-400 group-hover:text-primary-600 mb-3" />
                <p className="text-gray-600 font-medium">Click to upload image</p>
                <p className="text-sm text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </button>
            </div>

            {/* ファイル情報 */}
            {file && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg inline-flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800">{file.name}</span>
              </div>
            )}

            {/* 検出ボタン */}
            {file && (
              <button
                onClick={handleDetection}
                disabled={isProcessing}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-lg hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isProcessing ? 'Detecting...' : 'Detect Sensitive Info'}
              </button>
            )}
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* 画像編集エリア */}
        {imageUrl && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* 画像表示エリア */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Click red boxes to apply masking
                </h3>
                
                <div ref={containerRef} className="relative inline-block bg-gray-100 rounded-lg overflow-hidden">
                  {/* Canvas */}
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: scaled.width,
                      height: scaled.height,
                      display: imageUrl ? 'block' : 'none'
                    }}
                    className="max-w-full h-auto"
                  />
                  
                  {/* 検出領域のオーバーレイ */}
                  {detectedRegions.map((region) => (
                    <div
                      key={region.id}
                      onClick={() => handleRegionClick(region)}
                      className="absolute border-2 border-red-500 bg-red-500 bg-opacity-20 cursor-pointer hover:bg-opacity-30 transition-all duration-200"
                      style={{
                        left: region.x * scaled.scale,
                        top: region.y * scaled.scale,
                        width: region.width * scaled.scale,
                        height: region.height * scaled.scale,
                      }}
                      title={region.text || 'Click to mask'}
                    >
                      {region.text && (
                        <span className="absolute -top-6 left-0 text-xs bg-red-500 text-white px-1 py-0.5 rounded">
                          {region.text}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* コントロールパネル */}
              <div className="lg:w-64">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Controls</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={handleUndo}
                    disabled={maskedRegions.length === 0}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span>Undo</span>
                  </button>
                  
                  <button
                    onClick={handleReset}
                    disabled={maskedRegions.length === 0}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset All</span>
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    disabled={!imageUrl}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>

                {/* 統計情報 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Statistics</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Detected: {detectedRegions.length}</p>
                    <p>Masked: {maskedRegions.length}</p>
                    <p>Total: {detectedRegions.length + maskedRegions.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 説明セクション */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">100% Private</h3>
            <p className="text-sm text-gray-600">
              All processing happens locally. Your images never leave your device.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">AI-Powered</h3>
            <p className="text-sm text-gray-600">
              Advanced AI detects personal information, faces, and sensitive data automatically.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Easy Export</h3>
            <p className="text-sm text-gray-600">
              Download your masked images instantly. No watermarks, no quality loss.
            </p>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-16 py-8 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>© 2025 BlurTap. All rights reserved.</p>
          <p className="mt-2">No data is stored. All processing is done locally.</p>
        </div>
      </footer>
    </div>
  )
}