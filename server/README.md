# 灿灿专属版后端（can-can-server）

Spring Boot 3 + 内嵌式 Redis（jedis-mock，纯 Java 实现，无需安装外部 Redis）。

## 功能

1. **登录**：`POST /api/login`，密码即用户身份（内置 `002523` / `020510`）。
2. **通关进度持久化**：`GET/POST /api/progress`，防止前端刷新后数据丢失。

## 接口

### 登录
```
POST /api/login
Content-Type: application/json

{ "password": "002523" }
```
成功返回：
```json
{ "token": "xxx", "userId": "002523", "name": "灿灿" }
```
密码错误返回 401：`{ "error": "密码不对哦～" }`

### 读取进度
```
GET /api/progress
Authorization: Bearer {token}
```
返回：`{ "unlocked": 1, "cleared": [1, 2] }`

### 保存进度
```
POST /api/progress
Authorization: Bearer {token}
Content-Type: application/json

{ "unlocked": 3, "cleared": [1, 2] }
```

## 运行

```bash
cd server
./mvnw spring-boot:run
```

默认端口 `8080`，嵌入式 Redis 端口 `6370`。

## 部署

```bash
./mvnw clean package
java -jar target/can-can-server-0.0.1-SNAPSHOT.jar
```
