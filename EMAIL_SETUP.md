# 邮箱验证配置指南

## 功能概述
注册功能已增加了邮箱验证机制，用户注册时需要验证邮箱的真实性。

## 新增功能
- ✅ 注册表单增加验证码输入框
- ✅ 发送验证码到邮箱（6位数字）
- ✅ 60秒倒计时重发功能
- ✅ 验证码5分钟有效期
- ✅ 验证码使用一次后失效
- ✅ 友好错误提示

## 环境变量配置

### 开发环境
开发模式下，验证码会直接输出到控制台，无需配置邮件服务。

### 生产环境
需要配置以下环境变量来启用真实邮件发送：

```bash
# 邮件服务配置
SMTP_HOST=smtp.gmail.com          # 邮件服务器地址
SMTP_PORT=587                     # 邮件服务器端口
SMTP_USER=your-email@gmail.com    # 邮箱账号
SMTP_PASSWORD=your-app-password   # 邮箱密码或应用密码
SMTP_FROM=your-email@gmail.com    # 发件人邮箱
```

### 常用邮件服务配置

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # 需要开启2FA并生成应用密码
```

#### QQ邮箱
```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-qq@qq.com
SMTP_PASSWORD=your-authorization-code  # 需要开启SMTP服务并获取授权码
```

#### 163邮箱
```bash
SMTP_HOST=smtp.163.com
SMTP_PORT=587
SMTP_USER=your-email@163.com
SMTP_PASSWORD=your-authorization-code  # 需要开启SMTP服务并获取授权码
```

## 数据库表
新增 `spark_verification_codes` 表用于存储验证码：
- `id`: 主键
- `email`: 邮箱地址
- `code`: 6位验证码
- `expires_at`: 过期时间
- `used`: 是否已使用
- `created_at`: 创建时间

## 使用说明

### 对于用户
1. 填写注册信息（邮箱、密码、昵称）
2. 点击"Send Code"发送验证码到邮箱
3. 在邮箱中查看验证码（检查垃圾邮件箱）
4. 输入验证码完成注册

### 对于开发者
1. 安装依赖：
   ```bash
   pnpm install nodemailer @types/nodemailer
   ```
2. 配置环境变量
3. 重启应用

## 测试
在开发模式下，验证码会直接显示在控制台中，格式为：
```
=== 开发模式：验证码 ===
邮箱: test@example.com
验证码: 123456
有效期: 5分钟
===================
```

## 安全特性
- 验证码6位数字，随机生成
- 5分钟有效期
- 使用一次后失效
- 防止暴力破解：有60秒重发限制
- 邮箱格式验证
- 清理过期验证码