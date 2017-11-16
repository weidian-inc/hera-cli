# hera-cli

Hera 项目脚手架，可以将小程序运行于iOS\Android\浏览器中

## 各端依赖

> 前端依赖必须阅读，客户端内容请按需阅读！ 注意使用客户端调试时，PC 和客户端需处于同一网络中。

### 前端

> 尽量使用最新的[node](https://nodejs.org/en/)环境, 最低要求：v7.6.0

### iOS

> 使用模拟器调试只需安装 Xcode 即可，[真机调试](#真机调试)需另做配置。

目前需要 `Xcode 8.0` 或更高版本。你可以通过App Store或是到[Apple开发者官网](https://developer.apple.com/xcode/downloads/)上下载。这一步骤会同时安装Xcode IDE和Xcode的命令行工具。

> 虽然一般来说命令行工具都是默认安装了，但你最好还是启动`Xcode`，并在`Xcode | Preferences | Locations`菜单中检查一下是否装有某个版本的`Command Line Tools`。`Xcode`的命令行工具中也包含一些必须的工具，比如`git`等。

![](docs/assets/xcode-cmd-line-tools.png)

### 安卓

请按[此教程](docs/Android.md)搭建安卓开发环境

## 安装运行

安装本项目

```sh
# 从内部npm仓库安装
npm i hera-cli -g
```

初始化小程序

```sh
hera init projName
```

进入新建的项目, 确认根目录有 `config.json` 文件：

```sh
# 进入项目
cd projName

# 查看配置文件
cat config.json
```

运行

```sh
# browser
hera run web

# 安卓
hera run android

# ios
hera run ios
```

## 杂项

### 其它可能会用到的命令

```sh
# 单独开启服务器
hera run server

# 手动添加某一个平台的源码
hera add ios/android
```

### 真机调试

使用 **`iOS` 真机**进行调试时需要执行以下操作，**安卓或 `iOS` 模拟器用户可忽略**

- 全局安装[ios-deploy](https://github.com/phonegap/ios-deploy):

```sh
npm i ios-deploy -g

# 如果安装时报错，请尝试以下三种解决方案之一
sudo npm install -g ios-deploy --unsafe-perm=true

# 或
sudo npm install -g ios-deploy --allow-root

# 或：为 nobody 用户添加 /usr/local/lib/node_modules/ios-deploy/ios-deploy 文件的写权限
```

安装完该依赖后即可开始项目的初始化（hera init projName）和构建运行（hera run ios）

- 构建过程中会报错，提示您使用 Xcode 打开iOS项目

![](docs/assets/team-message-alert.png)

- 在 Xcode 中选择 WDHodoerDemo 项目，在 General 页面手动修改团队信息（需要[注册](https://developer.apple.com/account/)一个Apple ID）和 Bundle id

![](docs/assets/team-message-after.png)

- 下一步启动服务器

```sh
# 开启服务器，提供小程序资源
hera run server
```

- 点击 Xcode 左上角的运行按钮，将应用安装到真机中，第一次运行可能会出现如下信息，按着提示进行授权即可：打开您的 iPhone -> 打开设置 -> 通用 -> 最下方的设备管理 -> 选择您的 Apple ID -> 点击信任，完成上述操作后回到 Xcode，点击运行即可。

![](docs/assets/xcode-cert-alert.png)

- 上述流程只需配置一次，之后直接使用 `hera run ios` 即可， 不需开启 Xcode

### 使用已有的小程序项目

如果您已有编写好的小程序，可以将其放置到一个新的文件夹中，并在新文件夹的根目录创建一个 config.json 文件，在其中填入开发好的小程序的目录名称即可：

```json
{
  "dir": "path/to/wxapp"
}
```

目录结构如下，您只需在意小程序源码和配置文件部分

```tree
herademo
├── config.json     配置文件
├── .gitignore
├── heraPlatforms   客户端代码
├── heraTmp         中间产物
├── heraTmp         中间产物
├── src             小程序 Build 之前的代码
└── dist            小程序 Build 之后的代码
```
