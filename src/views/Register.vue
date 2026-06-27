<script setup lang="ts">
/**
 * 注册页 (C 端) — WEB.2
 *
 * 字段: 用户名 + 昵称(选填) + 手机号(选填) + 密码 + 确认密码
 *   - 确认密码是纯前端校验, 不发给后端
 *   - 昵称/手机号选填, 填了才发 (空串不发, 见 handleSubmit)
 *
 * 流程: 填表单 → 校验 → POST /auth/register → 后端"注册即登录"返 {token,user}
 *      → 入 Pinia → 跳首页/redirect
 */
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Avatar, Iphone } from '@element-plus/icons-vue'
import { registerApi, type RegisterParams } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const cartStore = useCartStore()

const formRef = ref<FormInstance>()
const form = reactive({
  username: '',
  nickname: '',
  phone: '',
  password: '',
  confirmPassword: ''
})

// 确认密码的自定义校验: 必须跟 password 一致
function validateConfirm(_rule: any, value: string, callback: (e?: Error) => void) {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 手机号自定义校验: 选填, 但填了就必须是 11 位 (1 开头)
function validatePhone(_rule: any, value: string, callback: (e?: Error) => void) {
  if (value && !/^1\d{10}$/.test(value)) {
    callback(new Error('请输入正确的 11 位手机号'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名 3~20 个字符', trigger: 'blur' }
  ],
  nickname: [
    { max: 20, message: '昵称最多 20 个字符', trigger: 'blur' }
  ],
  phone: [
    { validator: validatePhone, trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码 6~30 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' }
  ]
}
const loading = ref(false)

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    // 必填字段先放进去, 选填字段填了才发 (confirmPassword 不发, 空串不发)
    const payload: RegisterParams = { username: form.username, password: form.password }
    if (form.nickname.trim()) payload.nickname = form.nickname.trim()
    if (form.phone.trim())    payload.phone = form.phone.trim()
    const resp = await registerApi(payload)
    // 后端"注册即登录", 直接拿到 token + user
    userStore.login(resp.token, resp.user)
    cartStore.refreshCount()
    ElMessage.success('注册成功, 已自动登录')
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (e) {
    console.error('[register]', e)
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.push({ path: '/login', query: route.query })
}
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <div class="brand">
        <span class="brand-mall">mini</span><span class="brand-cloud">mall</span>
      </div>
      <h2 class="title">注册新账号</h2>
      <p class="subtitle">注册成功后自动登录</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="3~20 个字符">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="选填, 最多 20 个字符" maxlength="20">
            <template #prefix><el-icon><Avatar /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="选填, 11 位手机号" maxlength="11">
            <template #prefix><el-icon><Iphone /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="6~30 个字符" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次输入密码"
            show-password
            @keyup.enter="handleSubmit"
          >
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-button type="primary" :loading="loading" style="width: 100%;" @click="handleSubmit">
          {{ loading ? '注册中...' : '注 册' }}
        </el-button>
      </el-form>

      <div class="to-login">
        已有账号?
        <a href="javascript:void(0)" @click="goLogin">去登录</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary) 220px, var(--bg-page) 220px);
}
.register-card {
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
.to-login {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
.to-login a {
  color: var(--primary);
  font-weight: 600;
}
</style>
