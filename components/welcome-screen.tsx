"use client"

import { MessageCircle, FileText, Mic, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WelcomeScreenProps {
  onStartChat: (presetQuestion?: string) => void
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const features = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "智能对话",
      description: "与AI助手进行自然流畅的对话交流",
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "文档分析",
      description: "上传文档，让AI帮您快速理解和分析内容",
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "语音交互",
      description: "支持语音输入，让交流更加便捷自然",
    },
  ]

  const presetQuestions = [
    "Spark公寓的租金价格如何？",
    "有哪些户型可以选择？",
    "公寓周边的交通便利吗？",
    "入住需要什么手续？",
  ]

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="h-10 w-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Hi，我是您的 Spark AI 助手</h1>
            <p className="text-lg text-muted-foreground">有任何关于 Spark 公寓的问题都可以咨询我</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
              <CardContent className="p-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => onStartChat()}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            开始对话
          </Button>

          <p className="text-sm text-muted-foreground">您可以通过文字、语音或上传文档的方式与我交流</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">您可以这样问我：</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {presetQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs hover:bg-primary/10 hover:border-primary/50 bg-transparent transition-all duration-200 hover:scale-105"
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
