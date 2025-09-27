# 🚀 AWS Lambda Migration Plan - Phase 3 Cost Optimization

## 💰 **Cost Savings Potential**
- **Current ECS Fargate**: $21.18/month (24/7 containers)
- **Target Lambda**: $3-8/month (pay-per-use)
- **Estimated Savings**: $13-18/month (60-85% reduction)

## 🏗️ **Architecture Overview**

### **Current (ECS Fargate)**
```
Discord Bot (24/7 Container)
├── Discord.js WebSocket (persistent)
├── MySQL Connection Pool
├── Session Scheduler (setInterval)
├── WebSocket Client (dashboard)
└── In-memory state
```

### **Target (Lambda + EventBridge)**
```
Discord Interactions → API Gateway → Lambda Functions
                                   ├── Command Handler
                                   ├── Button Handler  
                                   ├── Modal Handler
                                   └── Select Handler

EventBridge Rules → Lambda Functions
                  ├── Session End Scheduler
                  ├── RSVP Poller
                  └── Cleanup Tasks

DynamoDB → State Storage (votes, sessions)
RDS → Persistent Data (movies, config)
```

## 📋 **Migration Components**

### **1. Discord Interaction Handlers (Lambda)**
- **API Gateway** receives Discord interactions
- **Lambda functions** handle commands, buttons, modals
- **No persistent connections** - stateless request/response
- **Cold start optimization** with provisioned concurrency

### **2. Scheduled Tasks (EventBridge + Lambda)**
- **Session End Detection**: EventBridge rules trigger Lambda
- **RSVP Polling**: Every 5 minutes via EventBridge
- **Cleanup Tasks**: Daily maintenance via EventBridge
- **Replace setInterval/setTimeout** with EventBridge schedules

### **3. State Management Migration**
- **In-memory votes** → DynamoDB with TTL
- **Pending payloads** → DynamoDB with TTL  
- **Session state** → DynamoDB
- **MySQL connection pool** → RDS Proxy for Lambda

### **4. WebSocket Integration**
- **Current**: Bot connects to dashboard WebSocket
- **Lambda**: API Gateway WebSocket or EventBridge to dashboard
- **Alternative**: Dashboard polls Lambda API endpoints

## 🔧 **Implementation Steps**

### **Phase 3A: Interaction Handlers (Week 1)**
1. Create API Gateway for Discord interactions
2. Convert command handlers to Lambda functions
3. Implement DynamoDB state storage
4. Test with development Discord application

### **Phase 3B: Scheduled Tasks (Week 2)**  
1. Create EventBridge rules for session scheduling
2. Convert session scheduler to Lambda functions
3. Implement RSVP polling Lambda
4. Test scheduling accuracy

### **Phase 3C: State Migration (Week 3)**
1. Migrate in-memory state to DynamoDB
2. Implement RDS Proxy for database connections
3. Update WebSocket integration
4. Performance testing

### **Phase 3D: Production Cutover (Week 4)**
1. Blue/green deployment strategy
2. DNS/webhook URL switching
3. Monitor performance and costs
4. Rollback plan if needed

## 💡 **Technical Considerations**

### **Advantages**
- **60-85% cost reduction** for bot hosting
- **Auto-scaling** based on Discord activity
- **No cold start** for interactions (API Gateway)
- **Serverless maintenance** (no container management)

### **Challenges**
- **Cold starts** for infrequent functions
- **15-minute Lambda timeout** (not an issue for Discord interactions)
- **State management** complexity increases
- **WebSocket integration** needs redesign

### **Mitigations**
- **Provisioned concurrency** for critical functions
- **DynamoDB TTL** for automatic cleanup
- **RDS Proxy** for connection pooling
- **EventBridge** for reliable scheduling

## 📊 **Cost Breakdown (Estimated)**

### **Lambda Costs**
- **Requests**: ~10,000/month = $2.00
- **Duration**: ~100GB-seconds/month = $1.67
- **Provisioned Concurrency**: 1 unit = $4.20
- **Total Lambda**: ~$8/month

### **Supporting Services**
- **DynamoDB**: ~$1-2/month (on-demand)
- **EventBridge**: ~$1/month
- **API Gateway**: ~$1/month
- **Total Supporting**: ~$3-4/month

### **Total Estimated Cost**: $11-12/month
### **Current ECS Cost**: $21.18/month
### **Monthly Savings**: $9-10/month (45-50%)

## 🎯 **Success Metrics**
- **Cost Reduction**: Target 45-50% savings
- **Performance**: <3s response time for interactions
- **Reliability**: 99.9% uptime for Discord commands
- **Functionality**: 100% feature parity with ECS version

## 🚨 **Rollback Plan**
- Keep ECS infrastructure for 30 days
- DNS/webhook switching capability
- Database compatibility maintained
- Automated rollback triggers on error rates

## 📅 **Timeline**
- **Week 1-2**: Development and testing
- **Week 3**: Beta environment deployment
- **Week 4**: Production migration
- **Week 5**: Monitoring and optimization
- **Week 6**: ECS infrastructure cleanup

---

**Next Steps**: Start with Phase 3A - Discord Interaction Handler migration
