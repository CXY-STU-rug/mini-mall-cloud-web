<script setup lang="ts">
/**
 * 收货地址管理 (个人中心) — WEB.6
 *
 * 套在 UserLayout 里 (左菜单 + 右内容)。
 *
 * 功能: 列表 + 新增 + 编辑 + 删除 + 设为默认。
 *   - 新增/编辑共用一个对话框 (el-dialog), 靠 editing 区分:
 *       editing == null  → 新增 (createAddress)
 *       editing == 某条   → 编辑 (updateAddress)
 *   - "设为默认" = 调 setDefaultAddress(id), 后端事务清旧默认+设新, 保证单一默认
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  listAddress, createAddress, updateAddress, removeAddress, setDefaultAddress, type Address
} from '@/api/address'

const list = ref<Address[]>([])
const loading = ref(true)

// 默认地址数量: >1 说明有脏数据(多默认), 此时默认行也放出"设为默认"按钮供修复
const defaultCount = computed(() => list.value.filter(a => a.isDefault === 1).length)

// 对话框状态
const dialogVisible = ref(false)
const editing = ref<Address | null>(null)   // null=新增, 否则=编辑
const formRef = ref<FormInstance>()
const form = reactive<Address>({
  receiver: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: 0
})

const rules: FormRules = {
  receiver: [{ required: true, message: '请输入收货人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不对', trigger: 'blur' }
  ],
  province: [{ required: true, message: '请输入省', trigger: 'blur' }],
  city: [{ required: true, message: '请输入市', trigger: 'blur' }],
  district: [{ required: true, message: '请输入区/县', trigger: 'blur' }],
  detail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

async function load() {
  loading.value = true
  try {
    list.value = await listAddress()
  } catch (e) {
    console.error('[address] load', e)
  } finally {
    loading.value = false
  }
}

// 打开新增对话框: 清空表单
function openAdd() {
  editing.value = null
  Object.assign(form, {
    receiver: '', phone: '', province: '', city: '', district: '', detail: '', isDefault: 0
  })
  dialogVisible.value = true
}

// 打开编辑对话框: 表单填回原值
function openEdit(a: Address) {
  editing.value = a
  Object.assign(form, a)
  dialogVisible.value = true
}

async function save() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  try {
    if (editing.value?.id) {
      await updateAddress(editing.value.id, { ...form })
      ElMessage.success('已修改')
    } else {
      await createAddress({ ...form })
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
    load()
  } catch (e) {
    console.error('[address] save', e)
  }
}

async function remove(a: Address) {
  try {
    await ElMessageBox.confirm(`删除地址「${a.receiver} ${a.detail}」?`, '提示', {
      type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消'
    })
  } catch {
    return
  }
  try {
    await removeAddress(a.id!)
    ElMessage.success('已删除')
    load()
  } catch (e) {
    console.error('[address] remove', e)
  }
}

// 设为默认: 调专用接口, 后端事务清掉旧默认再设这条, 保证只有一个默认
// (多默认脏数据时, 对默认行点击也允许 → 收敛成唯一默认; 单默认就没必要重复设)
async function setDefault(a: Address) {
  if (a.isDefault === 1 && defaultCount.value === 1) return
  try {
    await setDefaultAddress(a.id!)
    ElMessage.success('已设为默认')
    load()
  } catch (e) {
    console.error('[address] setDefault', e)
  }
}

onMounted(load)
</script>

<template>
  <div class="addr-mgr">
    <div class="header">
      <h3>收货地址</h3>
      <el-button type="primary" @click="openAdd">+ 新增地址</el-button>
    </div>

    <div v-loading="loading" class="list">
      <div v-for="a in list" :key="a.id" class="card">
        <div class="info">
          <div class="line1">
            <span class="receiver">{{ a.receiver }}</span>
            <span class="phone">{{ a.phone }}</span>
            <el-tag v-if="a.isDefault === 1" size="small" type="danger">默认</el-tag>
          </div>
          <div class="line2">{{ a.province }}{{ a.city }}{{ a.district }} {{ a.detail }}</div>
        </div>
        <div class="ops">
          <el-button v-if="a.isDefault !== 1 || defaultCount > 1" link type="primary" @click="setDefault(a)">设为默认</el-button>
          <el-button link @click="openEdit(a)">编辑</el-button>
          <el-button link type="danger" @click="remove(a)">删除</el-button>
        </div>
      </div>
      <el-empty v-if="!loading && list.length === 0" description="还没有收货地址" />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑地址' : '新增地址'"
      width="480px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="收货人" prop="receiver">
          <el-input v-model="form.receiver" placeholder="收货人姓名" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="11 位手机号" />
        </el-form-item>
        <el-form-item label="省" prop="province">
          <el-input v-model="form.province" placeholder="如: 广东省" />
        </el-form-item>
        <el-form-item label="市" prop="city">
          <el-input v-model="form.city" placeholder="如: 深圳市" />
        </el-form-item>
        <el-form-item label="区/县" prop="district">
          <el-input v-model="form.district" placeholder="如: 南山区" />
        </el-form-item>
        <el-form-item label="详细地址" prop="detail">
          <el-input v-model="form.detail" type="textarea" :rows="2" placeholder="街道/门牌号" />
        </el-form-item>
        <el-form-item label="设为默认">
          <el-switch :model-value="form.isDefault === 1" @change="(v: any) => form.isDefault = v ? 1 : 0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.addr-mgr {
  padding: 4px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}
.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
}
.line1 {
  display: flex;
  align-items: center;
  gap: 10px;
}
.receiver {
  font-weight: 600;
  color: var(--text-primary);
}
.phone {
  color: var(--text-regular);
}
.line2 {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
