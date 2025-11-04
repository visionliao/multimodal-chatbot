"use client"

import { MessageCircle, FileText, Mic, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useState } from "react"

interface WelcomeScreenProps {
  onStartChat: (presetQuestion?: string) => void
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const [selectedFeature, setSelectedFeature] = useState(0) // 默认选择Customer Service (索引0)

  const features = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "Customer Service",
      description: "客户服务",
      defaultMessage: "你好，我是客户",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Operations",
      description: "运营管理",
      defaultMessage: "你好，我是运营团队",
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Asset Management",
      description: "资管团队",
      defaultMessage: "你好，我是资管团队",
    },
  ]

  const presetQuestions = [
    "Spark公寓的租金价格如何？",
    "有哪些户型可以选择？",
    "公寓周边的交通便利吗？",
    "入住需要什么手续？",
  ]

  const handleStartChat = () => {
    const selectedMessage = features[selectedFeature].defaultMessage
    onStartChat(selectedMessage)
  }

  const handleFeatureClick = (index: number) => {
    setSelectedFeature(index)
  }

  const handleFeatureDoubleClick = (index: number) => {
    const selectedMessage = features[index].defaultMessage
    onStartChat(selectedMessage)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 relative">
      {/* 背景图片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.jpg')",
          filter: "brightness(0.3)"
        }}
      />

      <div className="max-w-2xl mx-auto text-center space-y-8 relative z-10">
        <div className="space-y-4">
          <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">Hi，我是您的 Spark AI 助手</h1>
            <p className="text-lg text-gray-200">有任何关于 Spark 公寓的问题都可以咨询我</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className={`border transition-colors cursor-pointer group backdrop-blur-sm ${
                selectedFeature === index 
                  ? 'border-primary bg-white/10' // 选中时：使用更亮的半透明背景
                  : 'border-transparent hover:border-primary/50 bg-black/20' // 默认：使用半透明深色背景
              }`}
              onClick={() => handleFeatureClick(index)}
              onDoubleClick={() => handleFeatureDoubleClick(index)}
            >
              <CardContent className="p-6 text-center space-y-3">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  selectedFeature === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-black/20 group-hover:bg-black/40 text-white'
                }`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-50">{feature.title}</h3>
                <p className="text-sm text-gray-300">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleStartChat}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            开始对话
          </Button>

          <p className="text-sm text-gray-200">您可以通过文字、语音或上传文档的方式与我交流</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-200">您可以这样问我：</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {presetQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-primary/10 hover:border-white/50 bg-transparent text-gray-200 border-gray-400 transition-all duration-200 hover:scale-105"
                onClick={() => onStartChat(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
