#!/bin/bash
# 智能客服系统部署脚本
# Author: 小开
# Date: 2026-03-08

set -e

echo "========================================"
echo "  AI智能客服系统 - 自动化部署脚本"
echo "========================================"
echo ""

# 配置变量
PROJECT_NAME="ai-chat-service"
DOCKER_REGISTRY="registry.example.com"
NAMESPACE="customer-service"
ENV=${1:-staging}

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 步骤1：代码检查
echo "【步骤1/7】代码质量检查..."
npm run lint
npm run test:unit
echo "✓ 代码检查通过"
echo ""

# 步骤2：构建Docker镜像
echo "【步骤2/7】构建Docker镜像..."
IMAGE_TAG="${DOCKER_REGISTRY}/${PROJECT_NAME}:${VERSION}"
docker build -t ${IMAGE_TAG} -f Dockerfile.prod .
docker tag ${IMAGE_TAG} ${DOCKER_REGISTRY}/${PROJECT_NAME}:latest
echo "✓ 镜像构建完成: ${IMAGE_TAG}"
echo ""

# 步骤3：推送镜像到仓库
echo "【步骤3/7】推送镜像到仓库..."
docker push ${IMAGE_TAG}
docker push ${DOCKER_REGISTRY}/${PROJECT_NAME}:latest
echo "✓ 镜像推送完成"
echo ""

# 步骤4：数据库迁移
echo "【步骤4/7】执行数据库迁移..."
npx typeorm migration:run
echo "✓ 数据库迁移完成"
echo ""

# 步骤5：部署到K8s
echo "【步骤5/7】部署到Kubernetes..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap-${ENV}.yaml
kubectl apply -f k8s/secret-${ENV}.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml
echo "✓ K8s资源部署完成"
echo ""

# 步骤6：等待部署完成
echo "【步骤6/7】等待服务启动..."
kubectl rollout status deployment/${PROJECT_NAME} -n ${NAMESPACE} --timeout=300s
echo "✓ 服务启动成功"
echo ""

# 步骤7：健康检查
echo "【步骤7/7】健康检查..."
SERVICE_URL=$(kubectl get svc ${PROJECT_NAME} -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
for i in {1..10}; do
    if curl -sf "http://${SERVICE_URL}:8080/health" > /dev/null; then
        echo "✓ 健康检查通过"
        break
    fi
    if [ $i -eq 10 ]; then
        log_error "健康检查失败"
        exit 1
    fi
    sleep 3
done

echo ""
echo "========================================"
echo "  部署成功！"
echo "========================================"
echo "环境: ${ENV}"
echo "版本: ${VERSION}"
echo "访问地址: http://${SERVICE_URL}:8080"
echo ""
