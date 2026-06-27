<script setup lang="ts">
/**
 * 我的资料 — WEB.8 (可编辑版)
 *
 * 后端补了 PUT /user/me 后, 这页从"只读"升级成"可改":
 *   - 头像: el-upload 自定义上传 → uploadFile(file,'avatar') 拿 url → 存进 form.avatar
 *   - 昵称/手机/邮箱: 输入框
 *   - 用户名: 只读 (登录凭证, 不让改)
 *   - 保存: 空串字段不发(避免误清空) → updateProfile 返回 void → 重新 load() 拉最新 → 同步回 userStore (顶栏头像/昵称跟着变)
 *
 * 数据来源: 进页面先用 userStore 里的信息填表单(秒显), 再拉 getUserById 覆盖成最新。
 */
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, type UploadRequestOptions } from 'element-plus'
import { getUserById, updateProfile, type UpdateProfileParams } from '@/api/user'
import { uploadFile } from '@/api/file'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const loading = ref(true)
const saving = ref(false)
const uploading = ref(false)
const username = ref('')   // 只读展示用

// 可编辑表单
const form = reactive({
  nickname: '',
  phone: '',
  email: '',
  avatar: ''
})

async function load() {
  const id = userStore.userInfo?.id
  if (!id) { loading.value = false; return }
  loading.value = true
  try {
    const u = await getUserById(id)
    username.value = u.username
    form.nickname = u.nickname || ''
    form.phone = u.phone || ''
    form.email = u.email || ''
    form.avatar = u.avatar || ''
  } catch (e) {
    console.error('[profile] load', e)
  } finally {
    loading.value = false
  }
}

/**
 * el-upload 的自定义上传: 覆盖它默认的上传行为, 改用我们自己的 uploadFile。
 * el-upload 会把要传的文件包在 options.file 里给我们。
 */
async function customUpload(options: UploadRequestOptions) {
  uploading.value = true
  try {
    const res = await uploadFile(options.file, 'avatar')
    form.avatar = res.url    // 拿到 url, 先填进表单, 等点保存才真正写库
    ElMessage.success('头像已上传, 记得点保存')
  } catch (e) {
    console.error('[profile] upload', e)
  } finally {
    uploading.value = false
  }
}

// 上传前校验: 只收图片, 限制 2MB
function beforeAvatarUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) { ElMessage.error('只能上传图片'); return false }
  if (!isLt2M) { ElMessage.error('图片不能超过 2MB'); return false }
  return true
}

async function save() {
  saving.value = true
  try {
    // 空串过滤: 只把真正填了的字段发给后端, 空的不发, 避免把已有昵称/邮箱误清空
    const payload: UpdateProfileParams = {}
    if (form.nickname.trim()) payload.nickname = form.nickname.trim()
    if (form.phone.trim())    payload.phone = form.phone.trim()
    if (form.email.trim())    payload.email = form.email.trim()
    if (form.avatar)          payload.avatar = form.avatar   // url 不 trim

    await updateProfile(payload)   // 后端返回 void, 拿不到更新后的资料
    await load()                   // 所以保存成功后重拉一遍, 用最新值覆盖表单

    // 同步回 store: 铺开原有字段(id/username/role/status 保留), 再覆盖刚改的几项
    userStore.setUserInfo({
      ...userStore.userInfo!,
      nickname: form.nickname,
      phone: form.phone,
      email: form.email,
      avatar: form.avatar
    })
    ElMessage.success('保存成功')
  } catch (e) {
    console.error('[profile] save', e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="profile-page" v-loading="loading">
    <h3 class="page-title">我的资料</h3>

    <div class="card">
      <!-- 头像上传 -->
      <div class="avatar-block">
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :http-request="customUpload"
          :before-upload="beforeAvatarUpload"
          accept="image/*"
        >
          <el-avatar v-if="form.avatar" :size="88" :src="form.avatar" />
          <el-avatar v-else :size="88">{{ (form.nickname || username).charAt(0) }}</el-avatar>
          <div class="avatar-tip">{{ uploading ? '上传中...' : '点击更换头像' }}</div>
        </el-upload>
      </div>

      <!-- 表单 -->
      <el-form label-width="80px" class="form">
        <el-form-item label="用户名">
          <el-input :model-value="username" disabled />
          <span class="hint">用户名不可修改</span>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="给自己起个昵称" maxlength="20" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="常用邮箱" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: 4px;
  min-height: 200px;
}
.page-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: var(--text-primary);
}
.card {
  max-width: 520px;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 24px;
}
.avatar-block {
  display: flex;
  justify-content: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
}
.avatar-uploader {
  text-align: center;
  cursor: pointer;
}
.avatar-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--primary);
}
.hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
