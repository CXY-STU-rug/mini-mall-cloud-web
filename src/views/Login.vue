<script setup lang="ts">
/**
 * 登录页 (C 端) — WEB.2
 *
 * 跟 admin 登录几乎一样, 区别:
 *   ① 不卡 role (C 端普通用户随便登)
 *   ② 登录成功后刷新购物车角标
 *   ③ 底部加"去注册"链接
 *
 * 流程: 填表单 → 校验 → POST /auth/login → 拿 {token,user} → 入 Pinia → 跳 redirect
 */
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { loginApi } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const formRef = ref<FormInstance>()
const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const loading = ref(false)

async function handleSubmit() {
  // ① 表单校验
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  // ② 调后端登录
  loading.value = true
  try {
    const resp = await loginApi(form)
    // ③ 入 store (自动写 localStorage)
    userStore.login(resp.token, resp.user)
    // ④ 拉一次购物车角标
    cartStore.refreshCount()
    ElMessage.success(`欢迎回来, ${resp.user.nickname || resp.user.username}`)
    // ⑤ 跳回原来想去的页, 没有就回首页
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (e) {
    // 拦截器已弹错误提示, 这里不重复
    console.error('[login]', e)
  } finally {
    loading.value = false
  }
}

// 去注册, 把 redirect 一起带过去 (注册成功也能跳回原页)
function goRegister() {
  router.push({ path: '/register', query: route.query })
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="brand-mall">mini</span><span class="brand-cloud">mall</span>
      </div>
      <h2 class="title">登录</h2>
      <p class="subtitle">登录 mini-mall 商城, 开始购物</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" autocomplete="username">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleSubmit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-button type="primary" :loading="loading" style="width: 100%;" @click="handleSubmit">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>

      <div class="to-register">
        还没有账号?
        <a href="javascript:void(0)" @click="goRegister">立即注册</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 京东风: 顶部红 → 下方浅灰渐变 */
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary) 220px, var(--bg-page) 220px);
}
.login-card {
  width: 380px;
  padding: 40px 36px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}
.brand {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -1px;
}
.brand-mall { color: var(--primary); }
.brand-cloud { color: var(--text-primary); }
.title {
  font-size: 22px;
  font-weight: 700;
  margin: 20px 0 6px;
  color: var(--text-primary);
}
.subtitle {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--text-secondary);
}
.to-register {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.to-register a {
  color: var(--primary);
  font-weight: 600;
}
</style>
