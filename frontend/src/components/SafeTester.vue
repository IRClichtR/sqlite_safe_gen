<!-- src/components/SafeTester.vue -->
<template>
    <div class="safe-tester">
      <h1>🔒 Secure Vault - Test Interface</h1>
      
      <div class="section">
        <h2>Créer un Nouveau Safe</h2>
        <input 
          v-model="newSafeName" 
          placeholder="Nom du safe" 
          class="input"
        />
        <input 
          v-model="newSafeDescription" 
          placeholder="Description (optionnel)" 
          class="input"
        />
        <button @click="createSafe" :disabled="loading" class="btn-primary">
          {{ loading ? 'Création...' : 'Créer Safe' }}
        </button>
      </div>
  
      <div class="section">
        <h2>Ouvrir un Safe Existant</h2>
        <input 
          v-model="safeUrl" 
          placeholder="URL du safe" 
          class="input"
        />
        <button @click="openSafe" :disabled="loading" class="btn-secondary">
          {{ loading ? 'Ouverture...' : 'Ouvrir Safe' }}
        </button>
      </div>
  
      <div v-if="result" class="result" :class="resultType">
        <h3>{{ resultType === 'success' ? '✅ Succès' : '❌ Erreur' }}</h3>
        <pre>{{ result }}</pre>
        <button v-if="createdUrl" @click="copyUrl" class="btn-copy">
          Copier l'URL
        </button>
      </div>
  
      <div v-if="currentSafe" class="safe-info">
        <h3>🗃️ Safe Ouvert</h3>
        <p>Safe chargé avec succès - Interface de gestion bientôt disponible</p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  import { SafeManager } from '../core/safeManager';
  
  const safeManager = new SafeManager();
  
  // État réactif
  const loading = ref(false);
  const result = ref('');
  const resultType = ref<'success' | 'error'>('success');
  const createdUrl = ref('');
  
  // Formulaires
  const newSafeName = ref('');
  const newSafeDescription = ref('');
  const safeUrl = ref('');
  
  // Safe ouvert
  const currentSafe = ref<Uint8Array | null>(null);
  
  async function createSafe() {
    if (!newSafeName.value.trim()) {
      showError('Veuillez entrer un nom pour le safe');
      return;
    }
  
    loading.value = true;
    try {
      const url = await safeManager.createNewSafe(
        newSafeName.value, 
        newSafeDescription.value
      );
      
      createdUrl.value = url;
      showSuccess(`Safe créé avec succès !\n\nURL: ${url}\n\n⚠️ Sauvegardez cette URL, elle ne sera plus affichée !`);
      
      // Reset form
      newSafeName.value = '';
      newSafeDescription.value = '';
      
    } catch (error) {
      showError(`Erreur lors de la création: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loading.value = false;
    }
  }
  
  async function openSafe() {
    if (!safeUrl.value.trim()) {
      showError('Veuillez entrer une URL de safe');
      return;
    }
  
    loading.value = true;
    try {
      const safe = await safeManager.openSafe(safeUrl.value);
      currentSafe.value = safe;
      showSuccess(`Safe ouvert avec succès !\n\nVous pouvez maintenant gérer vos documents.`);
    } catch (error) {
      showError(`Erreur lors de l'ouverture: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loading.value = false;
    }
  }
  
  function showSuccess(message: string) {
    result.value = message;
    resultType.value = 'success';
  }
  
  function showError(message: string) {
    result.value = message;
    resultType.value = 'error';
  }
  
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(createdUrl.value);
      showSuccess('URL copiée dans le presse-papier !');
    } catch (error) {
      showError('Impossible de copier l\'URL');
    }
  }
  </script>
  
  <style scoped>
  .safe-tester {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
  }
  
  .input {
    width: 100%;
    padding: 12px;
    margin: 8px 0;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
  }
  
  .btn-primary, .btn-secondary, .btn-copy {
    padding: 12px 24px;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    margin: 8px 0;
  }
  
  .btn-primary {
    background: #007bff;
    color: white;
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
  
  .btn-copy {
    background: #28a745;
    color: white;
    font-size: 14px;
    margin-left: 10px;
  }
  
  .btn-primary:hover, .btn-secondary:hover, .btn-copy:hover {
    opacity: 0.9;
  }
  
  .btn-primary:disabled, .btn-secondary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
  
  .result {
    margin: 20px 0;
    padding: 16px;
    border-radius: 4px;
    white-space: pre-wrap;
  }
  
  .result.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }
  
  .result.error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }
  
  .safe-info {
    background: #d1ecf1;
    border: 1px solid #b8daff;
    color: #0c5460;
    padding: 16px;
    border-radius: 4px;
    margin: 20px 0;
  }
  </style>