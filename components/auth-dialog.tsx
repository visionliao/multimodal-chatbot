"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  username: string
  phone?: string
  email?: string
}

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: (user: User) => void
}

export function AuthDialog({ open, onOpenChange, onLogin }: AuthDialogProps) {
  const [contactType, setContactType] = useState<"phone" | "email">("phone")
  const [step, setStep] = useState<"contact" | "verify">("contact")
  const [purpose, setPurpose] = useState<"login" | "register">("login")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const [formData, setFormData] = useState({
    contact: "",
    code: "",
    username: "",
  })

  const [error, setError] = useState("")

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!formData.contact) {
      setError("请输入手机号或邮箱")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: formData.contact,
          type: contactType,
          purpose,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep("verify")
        startCountdown()
      } else {
        setError(data.error || "发送验证码失败")
      }
    } catch (error) {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!formData.code) {
      setError("请输入验证码")
      return
    }

    if (purpose === "register" && !formData.username) {
      setError("请输入用户名")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: formData.contact,
          code: formData.code,
          purpose,
          username: formData.username,
          type: contactType,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onLogin(data.user)
        onOpenChange(false)
        resetForm()
      } else {
        setError(data.error || "验证失败")
      }
    } catch (error) {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ contact: "", code: "", username: "" })
    setStep("contact")
    setError("")
    setCountdown(0)
  }

  const handleTabChange = (value: string) => {
    setPurpose(value as "login" | "register")
    resetForm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (!open) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>登录或注册</DialogTitle>
        </DialogHeader>

        <Tabs value={purpose} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4">
            {step === "contact" ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>登录方式</Label>
                  <RadioGroup value={contactType} onValueChange={(value) => setContactType(value as "phone" | "email")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone-login" />
                      <Label htmlFor="phone-login">手机号登录</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email-login" />
                      <Label htmlFor="email-login">邮箱登录</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>{contactType === "phone" ? "手机号" : "邮箱"}</Label>
                  <Input
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder={contactType === "phone" ? "请输入手机号" : "请输入邮箱"}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button onClick={handleSendCode} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  发送验证码
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>验证码</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex space-x-2">
                  <Button onClick={handleVerify} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    登录
                  </Button>
                  <Button variant="outline" onClick={handleSendCode} disabled={countdown > 0 || loading}>
                    {countdown > 0 ? `${countdown}s` : "重发"}
                  </Button>
                </div>

                <Button variant="ghost" onClick={() => setStep("contact")} className="w-full">
                  返回
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="register" className="space-y-4">
            {step === "contact" ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label>注册方式</Label>
                  <RadioGroup value={contactType} onValueChange={(value) => setContactType(value as "phone" | "email")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone-register" />
                      <Label htmlFor="phone-register">手机号注册</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email-register" />
                      <Label htmlFor="email-register">邮箱注册</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>{contactType === "phone" ? "手机号" : "邮箱"}</Label>
                  <Input
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    placeholder={contactType === "phone" ? "请输入手机号" : "请输入邮箱"}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button onClick={handleSendCode} disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  发送验证码
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="请输入用户名"
                  />
                </div>

                <div className="space-y-2">
                  <Label>验证码</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="请输入6位验证码"
                    maxLength={6}
                  />
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex space-x-2">
                  <Button onClick={handleVerify} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    注册
                  </Button>
                  <Button variant="outline" onClick={handleSendCode} disabled={countdown > 0 || loading}>
                    {countdown > 0 ? `${countdown}s` : "重发"}
                  </Button>
                </div>

                <Button variant="ghost" onClick={() => setStep("contact")} className="w-full">
                  返回
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
