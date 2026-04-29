# 生产发布前服务器收紧策略（待执行）

> 状态：仅文档，不执行  
> 适用实例：阿里云 ECS（Ubuntu 22.04，香港）  
> 目标：在发布推广前完成端口收敛、SSH 加固、基础防刷与最小暴露面

## 1. 执行时机

在你准备“开始推广/放量”前执行，不建议在功能频繁变更期执行。  
执行窗口建议在低峰时段，预留 30-60 分钟观察时间。

## 2. 收紧目标（最终态）

1. 公网仅开放 `80/443`。  
2. SSH 仅保留一个端口（建议 `2222`），并限制来源为你的固定 IP。  
3. 关闭无关入口（如 `3389`、多余 `22/2222` 重复规则）。  
4. 启用基础 SSH 防爆破（`fail2ban`）。  
5. 应用层增加限流（短信、登录、API 请求）。  
6. 保留可回滚路径，避免“把自己锁在服务器外”。

## 3. 执行前检查清单

1. 确认你手头有阿里云控制台登录权限（不是仅 SSH）。  
2. 确认已绑定密钥或可用 root 密码。  
3. 确认本机出口 IP（固定公网 IP）：
   ```bash
   curl ifconfig.me
   ```
4. 记录当前网络与 SSH 状态（留档）：
   ```bash
   ss -tlnp | grep sshd
   sudo ufw status verbose
   sudo iptables -S > /root/iptables.before.$(date +%F-%H%M).txt
   ```
5. 业务进程健康确认（收紧前先确保服务正常）：
   ```bash
   cd /opt/zhima
   docker compose -f docker-compose.prod.yml ps
   curl -I http://127.0.0.1:3000
   curl -I https://www.cloudzhima.com
   ```

## 3.1 当前线上实际拓扑（2026-04-29 校验）

这部分是本次真实上线核对出来的现状，执行收紧前先按它判断，不要照着理想状态假设：

1. 当前线上仓库目录是 `/opt/zhima`。
2. 公网 `80/443` 当前由宿主机 `nginx` 进程持有，并反代到容器内 `app:3000`。
3. `docker-compose.prod.yml` 中的 `app`/`worker` 是当前真实发布链路；`nginx` 服务当前不在现网流量路径上。
4. 如果直接启动 compose 里的 `nginx` 服务，会与宿主机 `nginx` 争抢 `80/443` 端口。
5. 因此在做 SSH/端口收紧之前，先确认你是否继续维持“宿主机 `nginx` + compose `app/worker`”拓扑；如果要切回容器 `nginx`，需要单独安排入口切换窗口。

## 4. 推荐执行顺序（强烈按顺序）

## 4.1 先改阿里云安全组（第一道防线）

入方向保留规则：

1. `80/tcp` 来源 `0.0.0.0/0`
2. `443/tcp` 来源 `0.0.0.0/0`
3. `2222/tcp` 来源 `你的固定IP/32`（或暂时 `22/tcp`，二选一）

删除或禁用：

1. `3389/tcp`
2. `22/tcp` / `2222/tcp` 中来源 `0.0.0.0/0` 的广开放规则
3. 重复或无效规则

> 注意：先“新增精确规则”，验证可连后，再删旧规则。

## 4.2 再调整 SSH（第二道防线）

先备份：

```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F-%H%M%S)
```

建议配置（先保守版，避免误锁）：

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
cat <<'EOF' | sudo tee /etc/ssh/sshd_config.d/99-prod-hardening.conf
Port 2222
Protocol 2
PermitRootLogin yes
PasswordAuthentication yes
PubkeyAuthentication yes
MaxAuthTries 5
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
```

验证并重启：

```bash
sudo sshd -t && sudo systemctl restart ssh
ss -tlnp | grep sshd
```

> 后续稳定后可升级为更严格：`PermitRootLogin prohibit-password` + 仅密钥登录。

## 4.3 启用 fail2ban（SSH 基础防爆破）

```bash
sudo apt-get update
sudo apt-get install -y fail2ban
cat <<'EOF' | sudo tee /etc/fail2ban/jail.d/sshd.local
[sshd]
enabled = true
port = 2222
maxretry = 5
findtime = 10m
bantime = 1h
EOF
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

## 4.4 应用层限流（业务防刷）

你项目里已做短信验证码限制，发布前再确认：

1. `SMS_COOLDOWN_SECONDS`
2. `SMS_PHONE_HOURLY_LIMIT`
3. `SMS_PHONE_DAILY_LIMIT`
4. `SMS_IP_MINUTE_LIMIT`
5. `SMS_IP_DAILY_LIMIT`
6. `SMS_VERIFY_MAX_ATTEMPTS`

并确认 Nginx 或网关层存在基本请求限速（可后续补）。

## 4.5 部署链路与入口归属先校验，再做收紧

在真正收紧端口和 SSH 之前，先跑一遍下面的检查，避免你误把正在工作的入口收掉：

```bash
cd /opt/zhima
git rev-parse --short HEAD
docker compose -f docker-compose.prod.yml ps
ss -ltnp '( sport = :80 or sport = :443 )'
systemctl status nginx --no-pager
curl -I https://www.cloudzhima.com
```

预期解释：

1. 如果 `80/443` 显示的是宿主机 `nginx`，就按宿主机入口来做安全收紧，不要默认操作 compose `nginx`。
2. 如果未来入口拓扑变了，就必须先同步更新 `docs/config-consistency-regression-baseline.md` 和交接文档，再继续执行本 runbook。

## 5. 验收标准（执行后必须逐条通过）

1. 站点可访问：`http/https` 正常打开主页。  
2. SSH 仅允许你固定 IP 接入。  
3. 其他公网扫描端口显著减少（`80/443/ssh` 之外无开放）。  
4. 登录、注册、短信发送、代码生成、论文生成链路正常。  
5. 24 小时内无异常断连和高频错误告警。

## 6. 回滚预案（出现异常立即执行）

如果 SSH 异常，优先走阿里云控制台“远程连接”。

## 6.1 SSH 配置回滚

```bash
sudo rm -f /etc/ssh/sshd_config.d/99-prod-hardening.conf
sudo cp /etc/ssh/sshd_config.bak.<时间戳> /etc/ssh/sshd_config
sudo sshd -t && sudo systemctl restart ssh
```

## 6.2 安全组回滚

在阿里云控制台将旧规则恢复（至少恢复一个你可访问的 SSH 入口），再做排查。

## 7. 你发布时让我执行的口令模板

到时候你只要发这句，我就按本文档执行：

```text
按 docs/server-hardening-runbook-2026-03-30.md 执行生产收紧，先做检查清单，再分步变更，每一步都给我回执和回滚点。
```

---

如需我下一版补充“证书 HTTPS + Nginx 强制跳转 + HSTS + 日志告警”一体化收紧文档，我可以接着在这份 runbook 后面追加 v2。
