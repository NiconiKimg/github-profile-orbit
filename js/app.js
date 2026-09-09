/**
 * github-profile-orbit // Client-side Web Application & Dynamic Renderer
 * Bilingual interface (ES / EN) with live GitHub API integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let activeLang = localStorage.getItem('orbit_lang') || 'es';
  let currentStep = 1;
  let verifiedUser = null;
  let userRepos = [];
  let selectedTemplates = new Set(['space']);
  let selectedTheme = 'dark';
  let activePreviewTemplate = 'space';
  let lastGeneratedSvg = '';

  // Stepper Elements
  const stepIndicator1 = document.getElementById('stepIndicator1');
  const stepIndicator2 = document.getElementById('stepIndicator2');
  const stepIndicator3 = document.getElementById('stepIndicator3');

  const stepPanel1 = document.getElementById('stepPanel1');
  const stepPanel2 = document.getElementById('stepPanel2');
  const stepPanel3 = document.getElementById('stepPanel3');

  // Step 1 Controls
  const langToggleBtn = document.getElementById('langToggleBtn');
  const inputUsername = document.getElementById('inputUsername');
  const btnVerify = document.getElementById('btnVerify');
  const userVerifyAlert = document.getElementById('userVerifyAlert');
  const userProfileCard = document.getElementById('userProfileCard');
  const userAvatar = document.getElementById('userAvatar');
  const userRealName = document.getElementById('userRealName');
  const userHandle = document.getElementById('userHandle');
  const userBio = document.getElementById('userBio');
  const userReposCount = document.getElementById('userReposCount');
  const btnGoToStep2 = document.getElementById('btnGoToStep2');
  const quickPills = document.querySelectorAll('.pill-btn[data-user]');

  // Step 2 Controls
  const templateCards = document.querySelectorAll('.template-card');
  const btnSelectAllTemplates = document.getElementById('btnSelectAllTemplates');
  const btnSelectOnlySpace = document.getElementById('btnSelectOnlySpace');
  const themePills = document.querySelectorAll('.theme-pill-btn');
  const inputRole = document.getElementById('inputRole');
  const inputExclude = document.getElementById('inputExclude');
  const inputExternal = document.getElementById('inputExternal');
  const chkAnimations = document.getElementById('chkAnimations');
  const chkOrbits = document.getElementById('chkOrbits');
  const chkConstellations = document.getElementById('chkConstellations');
  const chkStats = document.getElementById('chkStats');
  const chkForks = document.getElementById('chkForks');
  const chkHeader = document.getElementById('chkHeader');
  const chkFooter = document.getElementById('chkFooter');
  const btnBackToStep1 = document.getElementById('btnBackToStep1');
  const btnGoToStep3 = document.getElementById('btnGoToStep3');

  // Step 2 Language Exclusion Combobox
  const excludeLangsCombobox = document.getElementById('excludeLangsCombobox');
  const excludeLangsControl = document.getElementById('excludeLangsControl');
  const excludeLangsBadges = document.getElementById('excludeLangsBadges');
  const inputExcludeLanguages = document.getElementById('inputExcludeLanguages');
  const excludeLangsDropdown = document.getElementById('excludeLangsDropdown');
  const quickExcludeLangs = document.getElementById('quickExcludeLangs');
  const excludedLangs = new Set();
  const discoveredLangs = new Set();

  // Step 3 Controls
  const previewSubtabs = document.getElementById('previewSubtabs');
  const previewSvgWrapper = document.getElementById('previewSvgWrapper');
  const btnDownloadSvg = document.getElementById('btnDownloadSvg');
  const btnCopyBadge = document.getElementById('btnCopyBadge');
  const btnCopyYaml = document.getElementById('btnCopyYaml');
  const yamlOutput = document.getElementById('yamlOutput');
  const btnBackToStep2 = document.getElementById('btnBackToStep2');
  const btnRestartWizard = document.getElementById('btnRestartWizard');
  const toastMsg = document.getElementById('toastMsg');

  // Bilingual Dictionary
  const I18N = {
    es: {
      langBtn: 'English',
      heroBadge: 'Open Source GitHub Action • 100% Gratuito',
      heroTagline: 'Genera un mapa cósmico vectorial (SVG) de tu ecosistema de repositorios y tecnologías para tu GitHub Profile README en 3 sencillos pasos.',
      stepperStep1: 'Perfil de GitHub',
      stepperStep2: 'Configuración',
      stepperStep3: 'Resultado & Workflow',
      step1Title: 'Paso 1: Identifica tu Usuario de GitHub',
      step1Desc: 'Escribe tu usuario para buscar tu cuenta y cargar tus repositorios reales en tiempo real.',
      labelUsername: 'Nombre de usuario en GitHub',
      placeholderUsername: 'ej. torvalds, octocat, tu-usuario',
      btnVerify: 'Verificar Perfil',
      verifying: 'Verificando...',
      btnToggleToken: 'Token de GitHub (opcional, para 5.000 req/h sin límites)',
      placeholderToken: 'ghp_... (solo lectura pública, no se almacena)',
      quickPillsTitle: 'Ejemplos rápidos:',
      profileVerified: 'Perfil Verificado',
      reposCountReady: 'repositorios públicos listos',
      btnGoToStep2: 'Continuar a Configuración',
      step2Title: 'Paso 2: Personaliza tu Ecosistema',
      step2Desc: 'Selecciona las plantillas que deseas generar (una, varias o todas), el modo de color y tus opciones avanzadas.',
      labelTemplates: 'Plantillas a Generar (Selecciona una o más)',
      btnSelectAll: 'Seleccionar Todas',
      btnSelectOnlySpace: 'Solo Space',
      descSpace: 'Sistema solar orbital donde tu avatar es el sol y tus repositorios orbitan clasificados por tamaño y tecnologías.',
      descLandscape: 'Cordillera gráfica moderna que compara el volumen de líneas y actividad con métricas de productividad.',
      descNetwork: 'Grafo de nodos y constelaciones tecnológicas que conecta repositorios por lenguajes compartidos.',
      descMinimal: 'Insignia compacta y formal de estadísticas con distribución de lenguajes de alto impacto.',
      labelTheme: 'Modo de Color',
      themeDark: 'Oscuro (Dark)',
      themeLight: 'Claro (Light)',
      themeAuto: 'Auto (Sincronizado con GitHub)',
      labelRole: 'Rol Profesional o Subtítulo Personalizado',
      placeholderRole: 'ej. Full-Stack Developer, Core Maintainer (opcional)',
      helpRole: 'Aparece en el encabezado de las plantillas (opcional).',
      labelExclude: 'Repositorios a Excluir',
      placeholderExclude: 'ej. dotfiles, *-test, demo-*',
      helpExclude: 'Nombres exactos o comodines separados por comas.',
      labelExcludeLangs: 'Lenguajes a Excluir',
      placeholderExcludeLangs: 'Buscar o escribir lenguaje (ej. HTML, Shell, CSS)...',
      placeholderExcludeLangsMore: '+ añadir otro...',
      helpExcludeLangs: 'Filtra tecnologías para excluirlas del gráfico Network y de la barra de lenguajes.',
      quickExcludeLangs: 'Sugerencias:',
      customLangAdd: 'Excluir "{name}"',
      noMatchingLangs: 'No hay más lenguajes coincidentes',
      labelExternal: 'Repositorios Externos / Colaboraciones',
      placeholderExternal: 'owner/repo (uno por línea, opcional)',
      helpExternal: 'Repositorios donde participaste. Se computarán tus contribuciones reales.',
      labelVisuals: 'Elementos Visuales y Filtros',
      chkAnim: 'Animaciones (OVNI, Nave, Satélite)',
      chkOrbits: 'Anillos de Órbita Planetaria',
      chkConst: 'Líneas de Constelación',
      chkStats: 'Pastillas de Métricas',
      chkForks: 'Incluir Forks / Bifurcaciones',
      chkHeader: 'Cabecera Superior',
      chkFooter: 'Barra Inferior de Lenguajes',
      btnBack: 'Volver al Perfil',
      btnGenerate: 'Generar Visualización y Workflow',
      step3Title: 'Paso 3: Visualización Generada y Workflow Listo',
      step3Desc: 'Revisa tus gráficos vectoriales calculados en tiempo real con tus datos reales y copia la Action para automatizar la actualización.',
      btnDownload: 'Descargar SVG',
      btnCopyBadge: 'Copiar Markdown para README',
      btnCopyYaml: 'Copiar Workflow YAML',
      btnModifyConfig: 'Modificar Configuración',
      btnNewUser: 'Crear para Otro Usuario',
      footerHeart: 'Desarrollado con ❤️ como software libre para la comunidad de desarrolladores de GitHub.',
      toastCopiedYaml: 'Workflow YAML copiado al portapapeles',
      toastCopiedBadge: 'Código Markdown copiado para tu README',
      toastDownloadStarted: 'Descarga de archivo SVG iniciada',
      toastSelectAtLeastOne: 'Debes mantener al menos una plantilla seleccionada',
      toastEnterUsername: 'Por favor introduce un nombre de usuario',
      errUserNotFound: 'Usuario no encontrado en GitHub. Revisa la ortografía.',
      noticeRateLimit: 'Límite horario de peticiones anónimas alcanzado en tu IP. Tu perfil está verificado y puedes continuar.',
      reposSyncNotice: 'Sincronización lista con GitHub Actions',
      errNoRepos: 'El usuario no tiene repositorios públicos accesibles en GitHub.',
      errGeneric: 'No se pudieron consultar los repositorios en este momento. Puedes continuar con la configuración.'
    },
    en: {
      langBtn: 'Español',
      heroBadge: 'Open Source GitHub Action • 100% Free',
      heroTagline: 'Generate a living vector (SVG) cosmos of your GitHub repositories and technologies for your Profile README in 3 simple steps.',
      stepperStep1: 'GitHub Identity',
      stepperStep2: 'Configuration',
      stepperStep3: 'Result & Workflow',
      step1Title: 'Step 1: Identify your GitHub User',
      step1Desc: 'Enter your username to look up your account and load your real repositories in real time.',
      labelUsername: 'GitHub Username',
      placeholderUsername: 'e.g. torvalds, octocat, your-user',
      btnVerify: 'Verify Profile',
      verifying: 'Verifying...',
      quickPillsTitle: 'Quick examples:',
      profileVerified: 'Profile Verified',
      reposCountReady: 'public repositories ready',
      btnGoToStep2: 'Continue to Configuration',
      step2Title: 'Step 2: Customize your Cosmos',
      step2Desc: 'Choose which templates to generate (one, several, or all), color theme, and advanced options.',
      labelTemplates: 'Templates to Generate (Select one or more)',
      btnSelectAll: 'Select All',
      btnSelectOnlySpace: 'Only Space',
      descSpace: 'Orbital solar system where your avatar is the sun and your repos orbit ranked by size and technologies.',
      descLandscape: 'Modern mountain ridges comparing repository volume, commit activity, and productivity metrics.',
      descNetwork: 'Node graph and tech constellations connecting repositories through shared programming languages.',
      descMinimal: 'Clean and compact badge showcasing language distribution and key GitHub metrics.',
      labelTheme: 'Color Mode',
      themeDark: 'Dark Mode',
      themeLight: 'Light Mode',
      themeAuto: 'Auto (Sync with GitHub)',
      labelRole: 'Custom Professional Role or Subtitle',
      placeholderRole: 'e.g. Full-Stack Developer, Core Maintainer (optional)',
      helpRole: 'Displayed in the template header banner (optional).',
      labelExclude: 'Repositories to Exclude',
      placeholderExclude: 'e.g. dotfiles, *-test, demo-*',
      helpExclude: 'Exact names or wildcards separated by commas or lines.',
      labelExcludeLangs: 'Languages to Exclude',
      placeholderExcludeLangs: 'Search or type language (e.g. HTML, Shell, CSS)...',
      placeholderExcludeLangsMore: '+ add another...',
      helpExcludeLangs: 'Filter out technologies from the Network graph and bottom language bar.',
      quickExcludeLangs: 'Suggestions:',
      customLangAdd: 'Exclude "{name}"',
      noMatchingLangs: 'No matching languages found',
      labelExternal: 'External Repositories / Collaborations',
      placeholderExternal: 'owner/repo (one per line, optional)',
      helpExternal: 'Repositories where you contributed. Real contribution ratio will be computed.',
      labelVisuals: 'Visual Elements & Filters',
      chkAnim: 'Animations (UFO, Spaceship, Satellite)',
      chkOrbits: 'Planetary Orbit Rings',
      chkConst: 'Constellation Filaments',
      chkStats: 'Telemetry Metric Pills',
      chkForks: 'Include Forks / Bifurcations',
      chkHeader: 'Header Banner',
      chkFooter: 'Footer Language Bar',
      btnBack: 'Back to Profile',
      btnGenerate: 'Generate Visualization & Workflow',
      step3Title: 'Step 3: Generated Result & Action Workflow',
      step3Desc: 'Preview your live vector graphics calculated with your real repositories and copy the workflow for your README.',
      btnDownload: 'Download SVG',
      btnCopyBadge: 'Copy Markdown for README',
      btnCopyYaml: 'Copy Workflow YAML',
      btnModifyConfig: 'Modify Configuration',
      btnNewUser: 'Create for Another User',
      footerHeart: 'Built with ❤️ as open-source software for the GitHub developer community.',
      toastCopiedYaml: 'Workflow YAML copied to clipboard',
      toastCopiedBadge: 'Markdown badge copied for your README',
      toastDownloadStarted: 'SVG file download started',
      toastSelectAtLeastOne: 'You must select at least one template',
      toastEnterUsername: 'Please enter a GitHub username',
      errUserNotFound: 'User not found on GitHub. Please check spelling.',
      noticeRateLimit: 'Anonymous GitHub API limit reached on this IP. Your profile is verified and you can proceed.',
      reposSyncNotice: 'Ready for GitHub Actions sync',
      errNoRepos: 'This user has no accessible public repositories on GitHub.',
      errGeneric: 'Could not query repositories at this time. You can proceed with the configuration.'
    }
  };

  // -------------------------------------------------------------
  // i18n Language Switching
  // -------------------------------------------------------------
  function setLanguage(lang) {
    activeLang = lang;
    localStorage.setItem('orbit_lang', lang);
    const dict = I18N[lang] || I18N.es;

    langToggleBtn.textContent = dict.langBtn;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (dict[key]) {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) {
        el.placeholder = dict[key];
      }
    });

    if (typeof renderLangChips === 'function') {
      renderLangChips();
    }

    if (currentStep === 3) {
      generateWorkflowYaml();
    }
  }

  langToggleBtn.addEventListener('click', () => {
    setLanguage(activeLang === 'es' ? 'en' : 'es');
  });

  // -------------------------------------------------------------
  // Navigation & Step Management
  // -------------------------------------------------------------
  function goToStep(step) {
    currentStep = step;

    stepIndicator1.classList.remove('active', 'completed');
    stepIndicator2.classList.remove('active', 'completed');
    stepIndicator3.classList.remove('active', 'completed');

    if (step === 1) {
      stepIndicator1.classList.add('active');
    } else if (step === 2) {
      stepIndicator1.classList.add('completed');
      stepIndicator2.classList.add('active');
    } else if (step === 3) {
      stepIndicator1.classList.add('completed');
      stepIndicator2.classList.add('completed');
      stepIndicator3.classList.add('active');
    }

    stepPanel1.classList.toggle('active', step === 1);
    stepPanel2.classList.toggle('active', step === 2);
    stepPanel3.classList.toggle('active', step === 3);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (step === 3) {
      renderStep3();
    }
  }

  // -------------------------------------------------------------
  // Step 1: Real GitHub Verification (No Placeholders, No Candidate Spam)
  // -------------------------------------------------------------
  // Cache to avoid any redundant requests
  const userCache = new Map();
  const repoCache = new Map();
  let sessionToken = '';

  function getApiHeaders() {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }
    return headers;
  }

  function showAlert(msg) {
    if (!msg) {
      userVerifyAlert.classList.add('is-hidden');
      userVerifyAlert.innerHTML = '';
      return;
    }
    userVerifyAlert.innerHTML = `<div class="rate-limit-card"><p class="rate-limit-text">${msg}</p></div>`;
    userVerifyAlert.classList.remove('is-hidden');
  }

  function showRateLimitAlert() {
    const isEs = activeLang === 'es';
    userVerifyAlert.innerHTML = `
      <div class="rate-limit-card">
        <div class="rate-limit-header">
          ${isEs ? 'Límite de peticiones anónimas de GitHub alcanzado (60/hora para esta IP)' : 'GitHub anonymous rate limit reached (60/hr for this IP)'}
        </div>
        <p class="rate-limit-text">
          ${isEs
            ? 'GitHub limita a 60 peticiones por hora a conexiones anónimas. Para continuar inmediatamente tienes dos opciones:'
            : 'GitHub limits anonymous connections to 60 requests per hour. To continue immediately you have two options:'}
        </p>
        <ul class="rate-limit-options">
          <li><strong>${isEs ? 'Opción 1:' : 'Option 1:'}</strong> ${isEs ? 'Esperar a que se renueve la cuota horaria de tu IP (se reinicia automáticamente cada hora).' : 'Wait for the hourly quota reset for your IP (resets automatically each hour).'}</li>
          <li><strong>${isEs ? 'Opción 2:' : 'Option 2:'}</strong> ${isEs ? 'Ingresar un GitHub Personal Access Token (PAT) gratuito (eleva el límite a 5.000 req/h).' : 'Provide a free GitHub Personal Access Token (PAT) (increases limit to 5,000 req/hr).'}</li>
        </ul>
        <div class="rate-limit-token-row">
          <input type="password" id="alertTokenInput" class="form-input" placeholder="${isEs ? 'Pega tu token: ghp_... (solo lectura)' : 'Paste your token: ghp_... (read only)'}">
          <button type="button" class="btn-secondary" id="btnApplyToken">${isEs ? 'Aplicar y Reintentar' : 'Apply & Retry'}</button>
        </div>
        <div class="rate-limit-help">
          <a href="https://github.com/settings/tokens/new?description=GitHub+Profile+Orbit+Preview&scopes=read:user" target="_blank" rel="noopener noreferrer">
            ${isEs ? '¿Cómo obtener un token gratuito en 1 minuto? (Clic aquí para abrir GitHub)' : 'How to get a free token in 1 minute? (Click here to open GitHub)'}
          </a>
          <span>${isEs ? '— No requiere permisos privados, solo identificación pública.' : '— No private permissions required, only public identification.'}</span>
        </div>
      </div>
    `;
    userVerifyAlert.classList.remove('is-hidden');

    const btnApply = document.getElementById('btnApplyToken');
    const inputTok = document.getElementById('alertTokenInput');
    if (btnApply && inputTok) {
      btnApply.addEventListener('click', async () => {
        const val = inputTok.value.trim();
        if (val) {
          sessionToken = val;
          userVerifyAlert.classList.add('is-hidden');
          userCache.clear();
          repoCache.clear();
          await verifyUser(inputUsername.value);
        }
      });
    }
  }

  async function verifyUser(username) {
    const clean = (username || '').trim();
    if (!clean) return false;

    const dict = I18N[activeLang];
    btnVerify.textContent = dict.verifying;
    showAlert('');

    // Check cache
    const key = clean.toLowerCase();
    if (userCache.has(key)) {
      verifiedUser = userCache.get(key);
      userAvatar.src = verifiedUser.avatarUrl;
      userRealName.textContent = verifiedUser.name;
      userHandle.textContent = `@${verifiedUser.login}`;
      userBio.textContent = verifiedUser.bio || '';
      userProfileCard.classList.add('visible');

      if (repoCache.has(key)) {
        userRepos = repoCache.get(key);
        userReposCount.textContent = `${userRepos.length} ${dict.reposCountReady}`;
      } else {
        await fetchUserRepos(verifiedUser.login);
      }
      btnVerify.textContent = dict.btnVerify;
      return true;
    }

    try {
      const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(clean)}`, {
        headers: getApiHeaders()
      });

      if (userRes.status === 404) {
        showAlert(dict.errUserNotFound);
        userProfileCard.classList.remove('visible');
        return false;
      }

      // If GitHub REST API returns 403 or 429 (rate-limited by IP), NEVER block!
      // Verify via public GitHub avatar (which has no rate limit)
      if (userRes.status === 403 || userRes.status === 429) {
        verifiedUser = {
          login: clean,
          name: clean,
          bio: '',
          avatarUrl: `https://github.com/${clean}.png`,
          followersCount: 0
        };
        userCache.set(key, verifiedUser);

        userAvatar.src = verifiedUser.avatarUrl;
        userRealName.textContent = verifiedUser.name;
        userHandle.textContent = `@${clean}`;
        userBio.textContent = '';
        userProfileCard.classList.add('visible');
        showRateLimitAlert();

        await fetchUserRepos(clean);
        return true;
      }

      if (!userRes.ok) {
        // Fallback for any other API network issue
        verifiedUser = {
          login: clean,
          name: clean,
          bio: '',
          avatarUrl: `https://github.com/${clean}.png`,
          followersCount: 0
        };
        userCache.set(key, verifiedUser);
        userAvatar.src = verifiedUser.avatarUrl;
        userRealName.textContent = verifiedUser.name;
        userHandle.textContent = `@${clean}`;
        userBio.textContent = '';
        userProfileCard.classList.add('visible');
        return true;
      }

      const u = await userRes.json();
      verifiedUser = {
        login: u.login,
        name: u.name || u.login,
        bio: u.bio || '',
        avatarUrl: u.avatar_url || `https://github.com/${clean}.png`,
        followersCount: u.followers || 0
      };
      userCache.set(key, verifiedUser);

      userAvatar.src = verifiedUser.avatarUrl;
      userRealName.textContent = verifiedUser.name;
      userHandle.textContent = `@${u.login}`;
      userBio.textContent = verifiedUser.bio;
      userProfileCard.classList.add('visible');

      // Fetch user's real repositories
      await fetchUserRepos(u.login);
      return true;
    } catch (err) {
      console.warn('Network or rate limit during user check, using fallback avatar:', err);
      verifiedUser = {
        login: clean,
        name: clean,
        bio: '',
        avatarUrl: `https://github.com/${clean}.png`,
        followersCount: 0
      };
      userCache.set(key, verifiedUser);
      userAvatar.src = verifiedUser.avatarUrl;
      userRealName.textContent = verifiedUser.name;
      userHandle.textContent = `@${clean}`;
      userBio.textContent = '';
      userProfileCard.classList.add('visible');
      return true;
    } finally {
      btnVerify.textContent = dict.btnVerify;
    }
  }

  async function fetchUserRepos(username) {
    const dict = I18N[activeLang];
    const key = (username || '').toLowerCase();
    if (repoCache.has(key)) {
      userRepos = repoCache.get(key);
      userReposCount.textContent = `${userRepos.length} ${dict.reposCountReady}`;
      userRepos.forEach(r => {
        if (r.primaryLanguage?.name) discoveredLangs.add(r.primaryLanguage.name);
        if (r.languages?.edges) {
          r.languages.edges.forEach(e => {
            if (e.node?.name) discoveredLangs.add(e.node.name);
          });
        }
      });
      return true;
    }

    userRepos = [];

    try {
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&type=all&sort=pushed`,
        { headers: getApiHeaders() }
      );

      if (reposRes.status === 403 || reposRes.status === 429) {
        userReposCount.textContent = dict.reposSyncNotice;
        showRateLimitAlert();
        return true;
      }

      if (!reposRes.ok) {
        userReposCount.textContent = dict.reposSyncNotice;
        return true;
      }

      const raw = await reposRes.json();
      if (!Array.isArray(raw) || raw.length === 0) {
        userReposCount.textContent = `0 ${dict.reposCountReady}`;
        repoCache.set(key, []);
        return true;
      }

      const getCol = window.ProfileOrbitRenderer
        ? window.ProfileOrbitRenderer.getLanguageColor
        : (l) => '#64748B';

      userRepos = raw.map(r => {
        const langName = r.language || 'Code';
        const langColor = getCol(langName);
        const approxBytes = Math.max(10000, (r.size || 10) * 1024);

        return {
          id: String(r.id),
          name: r.name,
          nameWithOwner: r.full_name,
          isFork: Boolean(r.fork),
          isArchived: Boolean(r.archived),
          isPrivate: Boolean(r.private),
          stargazerCount: r.stargazers_count || 0,
          forkCount: r.forks_count || 0,
          pushedAt: r.pushed_at || new Date().toISOString(),
          description: r.description || '',
          primaryLanguage: r.language ? { name: langName, color: langColor } : null,
          languages: {
            edges: r.language ? [{ size: approxBytes, node: { name: langName, color: langColor } }] : []
          },
          repositoryTopics: { nodes: [] },
          authorshipRatio: 1.0,
          isExternal: false
        };
      });

      // Populate discovered languages for the combobox
      userRepos.forEach(r => {
        if (r.primaryLanguage?.name) discoveredLangs.add(r.primaryLanguage.name);
        if (r.languages?.edges) {
          r.languages.edges.forEach(e => {
            if (e.node?.name) discoveredLangs.add(e.node.name);
          });
        }
      });

      repoCache.set(key, userRepos);
      userReposCount.textContent = `${userRepos.length} ${dict.reposCountReady}`;
      showAlert('');
      return true;
    } catch (err) {
      console.warn('Could not fetch repos directly:', err);
      userReposCount.textContent = dict.reposSyncNotice;
      return true;
    }
  }

  btnVerify.addEventListener('click', () => verifyUser(inputUsername.value));

  inputUsername.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      verifyUser(inputUsername.value);
    }
  });

  quickPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const user = pill.dataset.user;
      inputUsername.value = user;
      verifyUser(user);
    });
  });

  btnGoToStep2.addEventListener('click', async () => {
    const raw = inputUsername.value.trim();
    const dict = I18N[activeLang];
    if (!raw) {
      inputUsername.focus();
      showToast(dict.toastEnterUsername);
      return;
    }

    if (!verifiedUser || verifiedUser.login.toLowerCase() !== raw.toLowerCase()) {
      const ok = await verifyUser(raw);
      if (!ok && userRepos.length === 0) return;
    }

    goToStep(2);
  });

  btnBackToStep1.addEventListener('click', () => goToStep(1));

  // -------------------------------------------------------------
  // Step 2: Multi-Template & Configuration
  // -------------------------------------------------------------
  function updateTemplateSelectionUI() {
    templateCards.forEach(card => {
      const t = card.dataset.template;
      const isSelected = selectedTemplates.has(t);
      card.classList.toggle('selected', isSelected);
      const chk = card.querySelector('input[type="checkbox"]');
      if (chk) chk.checked = isSelected;
    });
  }

  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      const t = card.dataset.template;
      if (selectedTemplates.has(t)) {
        if (selectedTemplates.size > 1) {
          selectedTemplates.delete(t);
        } else {
          showToast(I18N[activeLang].toastSelectAtLeastOne);
        }
      } else {
        selectedTemplates.add(t);
      }
      updateTemplateSelectionUI();
    });
  });

  btnSelectAllTemplates.addEventListener('click', () => {
    selectedTemplates = new Set(['space', 'landscape', 'network', 'minimal']);
    updateTemplateSelectionUI();
  });

  btnSelectOnlySpace.addEventListener('click', () => {
    selectedTemplates = new Set(['space']);
    updateTemplateSelectionUI();
  });

  // Theme selection
  themePills.forEach(btn => {
    btn.addEventListener('click', () => {
      themePills.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTheme = btn.dataset.theme || 'dark';

      if (selectedTheme === 'light') {
        document.body.classList.add('light-mode-ui');
      } else {
        document.body.classList.remove('light-mode-ui');
      }
    });
  });

  btnGoToStep3.addEventListener('click', () => {
    if (selectedTemplates.size === 0) {
      selectedTemplates.add('space');
      updateTemplateSelectionUI();
    }
    if (!selectedTemplates.has(activePreviewTemplate)) {
      activePreviewTemplate = selectedTemplates.values().next().value;
    }
    goToStep(3);
  });

  btnBackToStep2.addEventListener('click', () => goToStep(2));
  btnRestartWizard.addEventListener('click', () => {
    inputUsername.value = '';
    verifiedUser = null;
    userRepos = [];
    discoveredLangs.clear();
    excludedLangs.clear();
    if (typeof renderLangChips === 'function') renderLangChips();
    userProfileCard.classList.remove('visible');
    showAlert('');
    goToStep(1);
    inputUsername.focus();
  });

  // -------------------------------------------------------------
  // Step 2: Language Exclusion Combobox Controller
  // -------------------------------------------------------------
  const POPULAR_LANGUAGES = [
    'HTML', 'CSS', 'Shell', 'SCSS', 'Makefile', 'Dockerfile', 'Jupyter Notebook',
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C', 'C++', 'C#', 'Go',
    'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Vue', 'R', 'Lua', 'PowerShell'
  ];

  let highlightedDropdownIndex = -1;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getLangColor(langName) {
    if (window.ProfileOrbitRenderer && window.ProfileOrbitRenderer.getLanguageColor) {
      return window.ProfileOrbitRenderer.getLanguageColor(langName);
    }
    return '#38BDF8';
  }

  function renderLangChips() {
    if (!excludeLangsBadges) return;
    excludeLangsBadges.innerHTML = '';

    excludedLangs.forEach(lang => {
      const chip = document.createElement('span');
      chip.className = 'lang-chip';
      const color = getLangColor(lang);

      chip.innerHTML = `
        <span class="chip-dot" style="background-color: ${color}"></span>
        <span>${escapeHtml(lang)}</span>
        <button type="button" class="chip-remove" title="Remove" data-lang="${escapeHtml(lang)}">&times;</button>
      `;

      chip.querySelector('.chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        removeExcludedLanguage(lang);
      });

      excludeLangsBadges.appendChild(chip);
    });

    const dict = I18N[activeLang] || I18N.es;
    if (inputExcludeLanguages) {
      inputExcludeLanguages.placeholder = excludedLangs.size > 0
        ? (dict.placeholderExcludeLangsMore || '+ añadir otro...')
        : (dict.placeholderExcludeLangs || 'Buscar o escribir lenguaje...');
    }

    // Update quick pills state
    if (quickExcludeLangs) {
      quickExcludeLangs.querySelectorAll('.quick-pill').forEach(btn => {
        const lang = btn.dataset.lang;
        if (excludedLangs.has(lang)) {
          btn.classList.add('active-excluded');
        } else {
          btn.classList.remove('active-excluded');
        }
      });
    }

    if (currentStep === 3) {
      renderDynamicPreview();
      generateWorkflowYaml();
    }
  }

  function addExcludedLanguage(rawLang) {
    const clean = (rawLang || '').trim();
    if (!clean) return;

    // Canonicalize match if known
    let matchedName = clean;
    const allKnown = new Set([...discoveredLangs, ...POPULAR_LANGUAGES]);
    for (const k of allKnown) {
      if (k.toLowerCase() === clean.toLowerCase()) {
        matchedName = k;
        break;
      }
    }

    excludedLangs.add(matchedName);
    if (inputExcludeLanguages) {
      inputExcludeLanguages.value = '';
    }
    closeDropdown();
    renderLangChips();
  }

  function removeExcludedLanguage(lang) {
    excludedLangs.delete(lang);
    renderLangChips();
  }

  function getAvailableOptions(filterText) {
    const q = (filterText || '').toLowerCase().trim();
    const allCandidates = new Map();

    // Prioritize languages found in user repos
    discoveredLangs.forEach(l => {
      if (!excludedLangs.has(l)) {
        allCandidates.set(l.toLowerCase(), l);
      }
    });

    // Add popular languages
    POPULAR_LANGUAGES.forEach(l => {
      if (!excludedLangs.has(l) && !allCandidates.has(l.toLowerCase())) {
        allCandidates.set(l.toLowerCase(), l);
      }
    });

    let list = Array.from(allCandidates.values());
    if (q) {
      list = list.filter(l => l.toLowerCase().includes(q));
    }
    return list;
  }

  function renderDropdown(filterText = '') {
    if (!excludeLangsDropdown) return;
    const dict = I18N[activeLang] || I18N.es;
    const options = getAvailableOptions(filterText);
    const q = (filterText || '').trim();
    excludeLangsDropdown.innerHTML = '';
    highlightedDropdownIndex = -1;

    let hasExact = false;
    options.forEach((lang, idx) => {
      if (lang.toLowerCase() === q.toLowerCase()) hasExact = true;

      const opt = document.createElement('div');
      opt.className = 'combobox-option';
      opt.dataset.index = String(idx);
      opt.dataset.lang = lang;
      const color = getLangColor(lang);

      opt.innerHTML = `
        <span class="combobox-option-dot" style="background-color: ${color}"></span>
        <span>${escapeHtml(lang)}</span>
      `;

      opt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addExcludedLanguage(lang);
      });

      excludeLangsDropdown.appendChild(opt);
    });

    // Allow adding custom language if not in list
    if (q && !hasExact && !excludedLangs.has(q)) {
      const customOpt = document.createElement('div');
      customOpt.className = 'combobox-option';
      customOpt.dataset.lang = q;
      const addText = (dict.customLangAdd || 'Excluir "{name}"').replace('{name}', escapeHtml(q));
      customOpt.innerHTML = `
        <span class="combobox-option-dot" style="background-color: #38BDF8"></span>
        <span><strong>+</strong> ${addText}</span>
      `;
      customOpt.addEventListener('mousedown', (e) => {
        e.preventDefault();
        addExcludedLanguage(q);
      });
      excludeLangsDropdown.prepend(customOpt);
    }

    if (excludeLangsDropdown.children.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'combobox-empty-option';
      empty.textContent = dict.noMatchingLangs || 'No matching languages';
      excludeLangsDropdown.appendChild(empty);
    }

    excludeLangsDropdown.style.display = 'block';
  }

  function closeDropdown() {
    if (excludeLangsDropdown) {
      excludeLangsDropdown.style.display = 'none';
      highlightedDropdownIndex = -1;
    }
  }

  if (excludeLangsControl && inputExcludeLanguages) {
    excludeLangsControl.addEventListener('click', () => {
      inputExcludeLanguages.focus();
    });

    inputExcludeLanguages.addEventListener('focus', () => {
      renderDropdown(inputExcludeLanguages.value);
    });

    inputExcludeLanguages.addEventListener('input', () => {
      renderDropdown(inputExcludeLanguages.value);
    });

    inputExcludeLanguages.addEventListener('keydown', (e) => {
      if (!excludeLangsDropdown || excludeLangsDropdown.style.display === 'none') {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          renderDropdown(inputExcludeLanguages.value);
          e.preventDefault();
          return;
        }
      }

      const items = excludeLangsDropdown.querySelectorAll('.combobox-option');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length === 0) return;
        highlightedDropdownIndex = (highlightedDropdownIndex + 1) % items.length;
        items.forEach((it, idx) => {
          it.classList.toggle('highlighted', idx === highlightedDropdownIndex);
          if (idx === highlightedDropdownIndex) it.scrollIntoView({ block: 'nearest' });
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length === 0) return;
        highlightedDropdownIndex = (highlightedDropdownIndex - 1 + items.length) % items.length;
        items.forEach((it, idx) => {
          it.classList.toggle('highlighted', idx === highlightedDropdownIndex);
          if (idx === highlightedDropdownIndex) it.scrollIntoView({ block: 'nearest' });
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedDropdownIndex >= 0 && items[highlightedDropdownIndex]) {
          addExcludedLanguage(items[highlightedDropdownIndex].dataset.lang);
        } else if (inputExcludeLanguages.value.trim()) {
          addExcludedLanguage(inputExcludeLanguages.value.trim());
        }
      } else if (e.key === 'Backspace' && !inputExcludeLanguages.value) {
        if (excludedLangs.size > 0) {
          const arr = Array.from(excludedLangs);
          removeExcludedLanguage(arr[arr.length - 1]);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (excludeLangsCombobox && !excludeLangsCombobox.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  // Quick Suggestion Pills
  if (quickExcludeLangs) {
    quickExcludeLangs.querySelectorAll('.quick-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (excludedLangs.has(lang)) {
          removeExcludedLanguage(lang);
        } else {
          addExcludedLanguage(lang);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // Step 3: Real In-Browser Dynamic Rendering
  // -------------------------------------------------------------
  const TEMPLATE_META = {
    space: { label: 'Space' },
    landscape: { label: 'Landscape' },
    network: { label: 'Network' },
    minimal: { label: 'Minimal' }
  };

  function assembleAllRepositories() {
    // Filter according to forks setting
    const allowForks = chkForks ? chkForks.checked : true;
    let repos = userRepos.filter(r => allowForks || !r.isFork);

    // Filter according to exclusion rules
    const excludePatterns = inputExclude.value
      .split(/[\n,]/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    if (excludePatterns.length > 0) {
      repos = repos.filter(r => {
        const name = r.name.toLowerCase();
        for (const p of excludePatterns) {
          if (name === p) return false;
          if (p.includes('*')) {
            const regex = new RegExp('^' + p.replace(/\*/g, '.*') + '$', 'i');
            if (regex.test(name)) return false;
          }
        }
        return true;
      });
    }

    // Add external repositories ONLY if explicitly entered by the user
    const extLines = inputExternal.value.split('\n').map(s => s.trim()).filter(Boolean);
    const getCol = window.ProfileOrbitRenderer
      ? window.ProfileOrbitRenderer.getLanguageColor
      : (l) => '#64748B';

    extLines.forEach((line, idx) => {
      const clean = line.toLowerCase().trim();
      if (!clean) return;
      const parts = clean.split('/');
      const repoName = parts[1] || parts[0];

      repos.push({
        id: `ext-${idx}-${clean.replace('/', '-')}`,
        name: repoName,
        nameWithOwner: clean,
        isFork: false,
        isArchived: false,
        isPrivate: false,
        stargazerCount: 4,
        forkCount: 1,
        pushedAt: new Date().toISOString(),
        description: 'External repository collaboration',
        primaryLanguage: { name: 'Code', color: getCol('Code') },
        languages: { edges: [{ size: 65000, node: { name: 'Code', color: getCol('Code') } }] },
        repositoryTopics: { nodes: [] },
        authorshipRatio: 0.65,
        isExternal: true
      });
    });

    return repos;
  }

  function renderDynamicPreview() {
    if (!window.ProfileOrbitRenderer) {
      const themeForFile = selectedTheme === 'light' ? 'light' : 'dark';
      previewSvgWrapper.innerHTML = `<img src="examples/${activePreviewTemplate}-${themeForFile}.svg" alt="Preview">`;
      return;
    }

    const allRepos = assembleAllRepositories();
    const targetUser = verifiedUser || {
      login: inputUsername.value.trim() || 'developer',
      name: inputUsername.value.trim() || 'Developer',
      bio: '',
      avatarUrl: `https://github.com/${inputUsername.value.trim() || 'github'}.png`,
      followersCount: 10
    };

    const roleVal = inputRole.value.trim();

    const svg = window.ProfileOrbitRenderer.generateOrbitSvg(
      targetUser,
      allRepos,
      {
        template: activePreviewTemplate,
        theme: selectedTheme,
        role: roleVal ? roleVal : undefined,
        showHeader: chkHeader.checked,
        showFooter: chkFooter.checked,
        showStats: chkStats.checked,
        showAnimations: chkAnimations.checked,
        showOrbits: chkOrbits.checked,
        showConstellations: chkConstellations.checked,
        includeForks: chkForks.checked,
        excludeRepositories: [],
        excludeLanguages: Array.from(excludedLangs)
      }
    );

    lastGeneratedSvg = svg;
    previewSvgWrapper.innerHTML = svg;
  }

  function renderStep3() {
    previewSubtabs.innerHTML = '';
    const templatesArr = Array.from(selectedTemplates);

    if (!selectedTemplates.has(activePreviewTemplate)) {
      activePreviewTemplate = templatesArr[0];
    }

    templatesArr.forEach(t => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preview-tab-btn ${t === activePreviewTemplate ? 'active' : ''}`;
      btn.textContent = TEMPLATE_META[t] ? TEMPLATE_META[t].label : t;
      btn.addEventListener('click', () => {
        activePreviewTemplate = t;
        document.querySelectorAll('.preview-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderDynamicPreview();
      });
      previewSubtabs.appendChild(btn);
    });

    renderDynamicPreview();
    generateWorkflowYaml();
  }

  function generateWorkflowYaml() {
    const user = (verifiedUser && verifiedUser.login) || inputUsername.value.trim() || '${{ github.repository_owner }}';
    const role = inputRole.value.trim();
    const excludeList = inputExclude.value.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    const excludeLangList = Array.from(excludedLangs);
    const extList = inputExternal.value.split('\n').map(s => s.trim()).filter(Boolean);
    const templatesArr = Array.from(selectedTemplates);

    let yaml = `name: Update GitHub Ecosystem Visualizer

on:
  schedule:
    - cron: '0 0 * * *' # Daily refresh at midnight UTC
  workflow_dispatch:     # Manual run trigger

permissions:
  contents: write

jobs:
  visualize:
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4`;

    if (templatesArr.length === 1) {
      const t = templatesArr[0];
      const templateLabel = TEMPLATE_META[t]?.label || t;
      yaml += `

      - name: Generate ${templateLabel} Visualization
        uses: NiconiKimg/github-profile-orbit@v1
        with:
          username: ${user}
          template: '${t}'
          theme: '${selectedTheme}'
          output_path: 'dist/github-profile-orbit.svg'`;

      if (role) yaml += `\n          role: '${role}'`;
      if (excludeList.length > 0) {
        yaml += `\n          exclude_repositories: |\n` + excludeList.map(r => `            ${r}`).join('\n');
      }
      if (excludeLangList.length > 0) {
        yaml += `\n          exclude_languages: |\n` + excludeLangList.map(l => `            ${l}`).join('\n');
      }
      if (extList.length > 0) {
        yaml += `\n          external_repositories: |\n` + extList.map(r => `            ${r}`).join('\n');
      }
      if (!chkForks.checked) yaml += `\n          include_forks: false`;
      if (!chkHeader.checked) yaml += `\n          show_header: false`;
      if (!chkFooter.checked) yaml += `\n          show_footer: false`;
      if (!chkStats.checked) yaml += `\n          show_stats: false`;
      if (!chkAnimations.checked) yaml += `\n          show_animations: false`;
      if (!chkOrbits.checked) yaml += `\n          show_orbits: false`;
      if (!chkConstellations.checked) yaml += `\n          show_constellations: false`;

      yaml += `\n          auto_commit: true
          commit_message: 'chore(orbit): update ${t} vector visualization [skip ci]'`;
    } else {
      templatesArr.forEach((t, index) => {
        const isLast = index === templatesArr.length - 1;
        const templateLabel = TEMPLATE_META[t]?.label || t;
        yaml += `

      - name: Generate ${templateLabel} (${index + 1}/${templatesArr.length})
        uses: NiconiKimg/github-profile-orbit@v1
        with:
          username: ${user}
          template: '${t}'
          theme: '${selectedTheme}'
          output_path: 'dist/github-profile-orbit-${t}.svg'`;

        if (role) yaml += `\n          role: '${role}'`;
        if (excludeList.length > 0) {
          yaml += `\n          exclude_repositories: |\n` + excludeList.map(r => `            ${r}`).join('\n');
        }
        if (excludeLangList.length > 0) {
          yaml += `\n          exclude_languages: |\n` + excludeLangList.map(l => `            ${l}`).join('\n');
        }
        if (extList.length > 0) {
          yaml += `\n          external_repositories: |\n` + extList.map(r => `            ${r}`).join('\n');
        }
        if (!chkForks.checked) yaml += `\n          include_forks: false`;
        if (!chkHeader.checked) yaml += `\n          show_header: false`;
        if (!chkFooter.checked) yaml += `\n          show_footer: false`;
        if (!chkStats.checked) yaml += `\n          show_stats: false`;
        if (!chkAnimations.checked) yaml += `\n          show_animations: false`;
        if (!chkOrbits.checked) yaml += `\n          show_orbits: false`;
        if (!chkConstellations.checked) yaml += `\n          show_constellations: false`;

        if (isLast) {
          yaml += `\n          auto_commit: true
          commit_message: 'chore(orbit): update multi-template visualizations [skip ci]'`;
        } else {
          yaml += `\n          auto_commit: false`;
        }
      });
    }

    yamlOutput.textContent = yaml;
  }

  // -------------------------------------------------------------
  // Clipboard and Download
  // -------------------------------------------------------------
  function showToast(text) {
    toastMsg.textContent = text;
    toastMsg.classList.add('show');
    setTimeout(() => toastMsg.classList.remove('show'), 2500);
  }

  btnCopyYaml.addEventListener('click', () => {
    navigator.clipboard.writeText(yamlOutput.textContent).then(() => {
      showToast(I18N[activeLang].toastCopiedYaml);
    });
  });

  btnCopyBadge.addEventListener('click', () => {
    const user = (verifiedUser && verifiedUser.login) || inputUsername.value.trim() || 'username';
    const templatesArr = Array.from(selectedTemplates);
    let badgeCode = '';

    if (templatesArr.length === 1) {
      const t = templatesArr[0];
      badgeCode = `<p align="center">\n  <img src="https://raw.githubusercontent.com/${user}/${user}/main/dist/github-profile-orbit.svg" alt="${user}'s GitHub Universe" width="850" />\n</p>`;
    } else {
      badgeCode = templatesArr.map(t => {
        return `<p align="center">\n  <img src="https://raw.githubusercontent.com/${user}/${user}/main/dist/github-profile-orbit-${t}.svg" alt="${user}'s ${t} Universe" width="850" />\n</p>`;
      }).join('\n\n');
    }

    navigator.clipboard.writeText(badgeCode).then(() => {
      showToast(I18N[activeLang].toastCopiedBadge);
    });
  });

  btnDownloadSvg.addEventListener('click', () => {
    if (lastGeneratedSvg) {
      const blob = new Blob([lastGeneratedSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `github-profile-orbit-${activePreviewTemplate}-${selectedTheme}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const themeForFile = selectedTheme === 'light' ? 'light' : 'dark';
      const a = document.createElement('a');
      a.href = `examples/${activePreviewTemplate}-${themeForFile}.svg`;
      a.download = `github-profile-orbit-${activePreviewTemplate}-${themeForFile}.svg`;
      a.click();
    }
    showToast(I18N[activeLang].toastDownloadStarted);
  });

  // Apply initial language preference
  setLanguage(activeLang);
});
