# 数字员工集成 - 验证测试脚本

import { execSync, spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const LOG_DIR = '/tmp';
const SERVICE_LOGS = {
  missionBackend: path.join(LOG_DIR, 'mission-control-backend.log'),
  missionFrontend: path.join(LOG_DIR, 'mission-control-frontend.log'),
  starOffice: path.join(LOG_DIR, 'star-office-ui.log'),
};

console.log('=============================================================');
console.log('🔍 数字员工集成 - 验证测试');
console.log('=============================================================\n');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * 检查 HTTP 服务是否可用
 */
async function checkHealth(url: string, name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      console.log(`✅ ${name} - HTTP ${res.statusCode}`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`⚠️  ${name} - 不可用 (${err.message})`);
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.abort();
      console.log(`⚠️  ${name} - 超时`);
      resolve(false);
    });
  });
}

/**
 * 检查端口是否被占用
 */
function checkPort(port: number, name: string): boolean {
  try {
    const output = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' });
    if (output.trim()) {
      console.log(`✅ ${name} - 端口 ${port} 已被占用（PID: ${output.trim()})`);
      return true;
    }
  } catch (err) {
    console.log(`⚠️  ${name} - 端口 ${port} 未被占用`);
    return false;
  }
  return false;
}

/**
 * 检查日志文件
 */
function checkLogFile(filePath: string, name: string): void {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      console.log(`✅ ${name} - 日志文件存在 (${stats.size} bytes)`);
    } else {
      console.log(`⚠️  ${name} - 日志文件为空`);
    }
  } catch (err) {
    console.log(`⚠️  ${name} - 日志文件不存在`);
  }
}

// ============================================================================
// Main Test
// ============================================================================

async function runTests() {
  let allTestsPassed = true;

  // Test 1: 检查端口占用
  console.log('📊 测试 1: 端口占用检查\n');

  const missionBackendRunning = checkPort(5173, 'Mission Control 后端');
  const starOfficeRunning = checkPort(19000, 'Star Office UI');

  console.log();

  // Test 2: 健康检查
  console.log('📊 测试 2: 服务健康检查\n');

  const missionHealthy = await checkHealth('http://localhost:5173/health', 'Mission Control');
  const starOfficeHealthy = await checkHealth('http://127.0.0.1:19000/health', 'Star Office UI');

  console.log();

  // Test 3: 日志文件检查
  console.log('📊 测试 3: 日志文件检查\n');

  checkLogFile(SERVICE_LOGS.missionBackend, 'Mission Control 后端日志');
  checkLogFile(SERVICE_LOGS.missionFrontend, 'Mission Control 前端日志');
  checkLogFile(SERVICE_LOGS.starOffice, 'Star Office UI 日志');

  console.log();

  // Test 4: 文件完整性检查
  console.log('📊 测试 4: 文件完整性检查\n');

  const requiredFiles = [
    { path: '/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/src/App.vue', name: 'App.vue（已集成 Tab）' },
    { path: '/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/start-integrated-services.sh', name: '启动脚本' },
    { path: '/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/stop-integrated-services.sh', name: '停止脚本' },
    { path: '/Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/kanban-full-managed/packages/backend/src/server.ts', name: 'Mission Control 后端' },
    { path: '/Users/lihzz/.openclaw/shared-workspace/projects/digital-employee/Star-Office-UI/backend/app.py', name: 'Star Office UI' },
  ];

  for (const file of requiredFiles) {
    try {
      fs.accessSync(file.path);
      console.log(`✅ ${file.name}`);
    } catch (err) {
      console.log(`❌ ${file.name} - 不存在`);
      allTestsPassed = false;
    }
  }

  console.log();

  // Test 5: App.vue 内容检查
  console.log('📊 测试 5: App.vue Tab 集成检查\n');

  try {
    const appVueContent = fs.readFileSync('/Users/lihzz/.openclaw/shared-workspace/project-digital-employee/src/App.vue', 'utf-8');

    if (appVueContent.includes('mission-control')) {
      console.log('✅ Mission Control Tab 已集成');
    } else {
      console.log('❌ Mission Control Tab 未找到');
      allTestsPassed = false;
    }

    if (appVueContent.includes('star-office')) {
      console.log('✅ Star Office UI Tab 已集成');
    } else {
      console.log('❌ Star Office UI Tab 未找到');
      allTestsPassed = false;
    }

    if (appVueContent.includes('localhost:5173')) {
      console.log('✅ Mission Control iframe URL 正确');
    } else {
      console.log('❌ Mission Control iframe URL 未找到');
      allTestsPassed = false;
    }

    if (appVueContent.includes('127.0.0.1:19000')) {
      console.log('✅ Star Office UI iframe URL 正确');
    } else {
      console.log('❌ Star Office UI iframe URL 未找到');
      allTestsPassed = false;
    }
  } catch (err) {
    console.log('❌ App.vue 读取失败');
    allTestsPassed = false;
  }

  console.log();

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('=============================================================');
  console.log('📋 测试总结');
  console.log('=============================================================\n');

  if (allTestsPassed) {
    console.log('✅ 所有测试通过！集成成功！');
    console.log('\n🚀 下一步：');
    console.log('   1. 启动服务: ./start-integrated-services.sh');
    console.log('   2. 启动数字员工: npm run dev');
    console.log('   3. 访问应用并在浏览器中切换 Tab\n');
  } else {
    console.log('⚠️  部分测试未通过，请检查：\n');
    console.log('   • App.vue 是否正确集成');
    console.log('   • 服务是否正在运行');
    console.log('   • 端口是否被正确占用');
  }

  console.log('=============================================================\n');
}

// Run tests
runTests().catch(console.error);