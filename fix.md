You have a sharp eye! Your intuition is absolutely correct. Both `src/utils/componentLibHelper.js` and the `VUE_APP_INTERNAL_LIB_NAME` environment variable are remnants of a previous design and are **no longer used** in the current application logic. They should be removed.

This is an excellent cleanup step that will simplify your codebase and configuration.

### 详细的开发思路和方案

#### 1. 问题分析与现状

*   **`src/utils/componentLibHelper.js`**: 这个文件的唯一作用是根据一个输入（如 'mtd' 或 'yxfe'）来返回一个硬编码或通过环境变量配置的内部库名称。
*   **`VUE_APP_INTERNAL_LIB_NAME`**: 这个环境变量的唯一作用是为 `componentLibHelper.js` 提供一个可配置的库名。
*   **当前使用情况**: 通过对整个项目的代码进行追踪，我们发现 **没有任何地方调用了 `getDisplayInternalLibName` 函数**。相关的逻辑（比如在 Prompt 中告诉 AI 使用哪个组件库）现在是通过将用户在 `UploadAndSettings.vue` 中选择的 `componentLibrary` 值直接传递给 Prompt 生成函数来实现的。
*   **结论**: 这两个部分是典型的 **"死代码" (Dead Code)**，可以被安全地移除。

#### 2. 存在的问题与风险

保留这些未使用的代码和配置会带来几个问题：

*   **代码冗余**: 增加了项目的代码量，使新开发者感到困惑。
*   **配置混乱**: `.env.example` 文件中存在一个无用的配置项，可能会误导使用者去配置它。
*   **逻辑不一致**: Prompt (`initialGenerationPrompt.js`) 中硬编码了 `yxfe/mtd` 这样的例子，这与一个可配置的系统意图相悖，并且可能已经过时。

#### 3. 开发方案：移除并优化

我们的方案分为两步：首先是安全地移除无用代码，其次是借此机会优化相关的 Prompt，使其逻辑更清晰、更健壮。

**第一步：删除文件和配置**

1.  **删除文件**: 直接删除 `src/utils/componentLibHelper.js` 文件。
2.  **清理环境变量**: 从 `.env` 和 `.env.example` 文件中移除 `VUE_APP_INTERNAL_LIB_NAME`。

**第二步：优化 Prompt**

当前 `initialGenerationPrompt.js` 中有一段硬编码的、可能会引起混淆的文本。我们将把它修改为更通用、更动态的形式，直接使用从UI传入的 `componentLibrary` 变量。

---

### 完整代码修改

以下是所有需要修改的文件的最终版本。您可以直接复制粘贴。

#### 1. 清理 `.env` 文件

<!-- .env -->
```.env
# --- Initial Prompt Generation API ---
VUE_APP_INITIAL_GEN_API_KEY='21906908414505340944'
VUE_APP_INITIAL_GEN_BASE_URL='https://aigc.sankuai.com/v1/openai/native'
VUE_APP_INITIAL_GEN_MODEL='gpt-4.1'
VUE_APP_INITIAL_GEN_MAX_TOKENS='20000'

# --- Prompt Refinement & Validation API ---
VUE_APP_REFINEMENT_API_KEY='21906908414505340944'
VUE_APP_REFINEMENT_BASE_URL='https://aigc.sankuai.com/v1/openai/native'
VUE_APP_REFINEMENT_MODEL='gpt-4.1'
```

#### 2. 清理 `.env.example` 文件

<!-- .env.example -->
```.env.example
# Blueprint AI - 环境配置文件
# 复制此文件为 .env (或 .env.local) 并填入您的实际配置值
# .env.local 应该添加到 .gitignore 中

# --- 初始蓝图生成 API ---
# 用于从图片直接生成初始开发蓝图
VUE_APP_INITIAL_GEN_API_KEY="YOUR_API_KEY_HERE"
VUE_APP_INITIAL_GEN_BASE_URL="https://openrouter.ai/api/v1"
VUE_APP_INITIAL_GEN_MODEL="gpt-4.1"
VUE_APP_INITIAL_GEN_MAX_TOKENS="20000"

# --- 蓝图优化与校验 API ---
# 用于通过对话优化或自动校验蓝图
VUE_APP_REFINEMENT_API_KEY="YOUR_API_KEY_HERE"
VUE_APP_REFINEMENT_BASE_URL="https://openrouter.ai/api/v1"
VUE_APP_REFINEMENT_MODEL="gpt-4.1"

# 注意: "初始生成" 和 "蓝图优化" 可能使用相同的 API 密钥和基础 URL。
# 如果是这样, 您可以将 VUE_APP_INITIAL_GEN_API_KEY 和 VUE_APP_REFINEMENT_API_KEY 设置为相同的值。
```

#### 3. 优化初始生成 Prompt

这是最关键的一步。我们移除了硬编码的库名，使其完全由传入的参数动态控制。

<!-- src/prompts/initialGenerationPrompt.js -->
```javascript
/**
 * @param {string} framework - The selected frontend framework (e.g., 'Vue', 'React').
 * @param {string} componentLibrary - The selected component library.
 * @param {string} applicationType - The type of application (e.g., 'web').
 * @returns {string} The full system prompt for initial image-to-prompt generation, strictly adhering to the original structure.
 */
export const getInitialGenerationSystemPrompt = (framework, componentLibrary, applicationType = 'web') => {
  // NOTE: This version is a strict restoration of the original prompt's structure and wording,
  // only replacing hardcoded values with dynamic variables for framework and component library.
  const defaultDynamicResponsePrefix = `
    Create detailed ${framework} components with these requirements:
    **Core Technical & Project Requirements:**
    1.  **Structure & Language:** Use ${framework === 'Vue' ? 'Vue Single File Components (`.vue`) with (`<template>`, `<script>`, `<style scoped>`)' : 'functional components'}. Default to JavaScript for logic.
    2.  **Component Library:**
        *   **Primary:** Prioritize components from the selected library: **${componentLibrary}**. All standard elements (forms, tables, buttons, etc.) should use components from this library.
    3.  **Custom Styling:** Use custom CSS/SCSS in ${framework === 'Vue' ? '`<style scoped>`' : 'a corresponding CSS module'} ONLY for fine-tuning layout or when library components do not suffice. Do not reinvent styles that the library provides.
    4.  **Icons:** Prioritize the selected library's icon system or a project-standard icon set.
    5.  **Code Quality & Conventions:**
        *   Generate complete, functional code for the target framework.
        *   Strictly adhere to existing code formatting and naming conventions (components: PascalCase, props/methods: camelCase, CSS: kebab-case).
        *   Follow proper import practices for all modules.
    `;

  return `You are an expert frontend developer. Your task is to analyze a UI image and generate a comprehensive, actionable prompt for another frontend developer to implement that UI within an enterprise ${framework} ${applicationType} project. This project heavily uses a component library named '${componentLibrary}'.
    **Important Notes:**
    1. Use JavaScript by default for all component implementations.
    2. Only switch to TypeScript if explicitly requested by the user.
    3. Follow standard ${framework} practices for component structure, props, data, methods, etc.
    4. **The language of your generated response (the entire prompt including summary, analysis, and planning) MUST match the primary language of the text visible in the provided image. For example, if the image contains primarily Chinese text, your entire response should be in Chinese. If it's English, respond in English.**

    the generated prompt should contain the following parts:

    0. <response_prefix>
    1. <summary_title>
    2. <image_analysis>
    3. <development_planning>

    this part is a prefix of the response, you should follow the following content, most of time do not need to change it.

    ${defaultDynamicResponsePrefix}

    ### summary_title

    Generate a concise, descriptive title for the page or feature depicted in the image, reflecting its primary function within the application.

    ### image_analysis

    Analyze the provided image meticulously and describe its visual components, their properties, and their relationships in detail. Focus on elements relevant for UI implementation:

    1.  **Primary Purpose/Goal:** Briefly state the main objective or function of the UI depicted in the image (e.g., "User registration form", "Product listing page with filters", "Dashboard displaying key metrics").
    2.  **Navigation Elements:** Identify ALL visible navigation components (e.g., sidebars, top navigation bars, tab bars, breadcrumbs, pagination). Describe their items, icons, labels, and apparent purpose (e.g., "Sidebar menu with items: 'Dashboard' (icon: home), 'Settings' (icon: gear), 'Profile' (icon: user)"; "Header with a logo on the left, search bar in the middle, and user avatar with a dropdown menu on the right").
    3.  **Overall Page Layout:** Describe the high-level structure and arrangement of major sections (e.g., "Two-column layout: a fixed 200px left sidebar and a main content area that scrolls", "Header (60px height) - Main Content (flexible height) - Footer (40px height)", "Grid-based dashboard with 2x2 cards"). Specify alignment and spacing if discernible.
    4.  **Content Sections & Blocks:** Detail each distinct block or section of content within the main area. For each block, describe its purpose, child elements, and their arrangement (e.g., "User Profile Section: Contains an avatar, user name, email, and an 'Edit Profile' button. Elements are vertically stacked.", "Product Card: Displays product image, name, price, and 'Add to Cart' button.").
    5.  **Interactive Controls & Forms:** List ALL interactive elements: buttons (specify variants like primary, secondary, text, icon-only), input fields (text, password, number, date pickers, etc.), dropdowns/selects, checkboxes, radio buttons, toggles, sliders, links, etc. For each, specify its label, placeholder text, current value (if visible), associated icons, and likely action or purpose. For forms, describe all fields, their types, labels, and any validation hints.
    6.  **Text Content & Typography:** List all significant pieces of text visible (headings, labels, paragraphs, captions, button text). Note their apparent font size, weight (bold, normal), color, and alignment if it stands out from a default.
    7.  **Key Visual Elements & Graphics:** Note prominent visual elements like images (describe content), icons (specify if they look like standard Element UI icons or custom ones), charts (type of chart and data represented), illustrations, logos, dividers, or custom graphics. Describe their appearance and placement.
    8.  **Color Palette & Theme:** Detail the dominant color palette (primary, secondary, accent colors, background colors, text colors). Note if the theme appears light, dark, or custom, and if it aligns with or deviates significantly from standard library defaults.
    9.  **Data Display:** If data is displayed (e.g., in tables, lists, cards), describe the structure of the data and the fields shown (e.g., "User table with columns: ID, Name, Email, Status. Status is shown as a colored badge.").
    10. **Implicit Details & Interactions:** Infer and describe any non-obvious details or implied interactions (e.g., "Hover states on buttons suggest a color change", "Active tab is visually distinct", "Clicking the avatar likely opens a user menu").

    ### development_planning

    Based on the image analysis and the assumption of an existing enterprise ${framework} + ${componentLibrary} codebase with established patterns, outline a development plan:

    1.  **File Structure & Organization:**
        *   **Page Creation Logic:** **Default to creating a new page** unless the user explicitly requests enhancement to an existing page. Treat the UI as a new independent functional area that requires its own route and file structure.
        *   **New Page Structure:** Create \`src/pages/FeatureName/\` with: \`index.vue\` (main component), \`api.js\` (API calls), \`config.js\` (constants), and \`components/\` folder if needed.
        *   **File Creation Rules:**
            - \`api.js\`: Create when feature requires API calls
            - \`config.js\`: Create for feature-specific constants/enums
            - \`components/\`: Only when components meet reusability/complexity criteria

    2.  **Component Utilization Strategy (CRITICAL):**
        *   **Library First:** For ALL standard UI elements (forms, tables, dialogs, drawers, buttons, inputs, layout grids, etc.), **you MUST specify direct usage of components from the component library (\`${componentLibrary}\`).**
        *   **DO NOT suggest creating new custom component files for functionalities readily available through these libraries.** For instance, a data table should be implemented using a table component from \`${componentLibrary}\`, not by creating a new \`MyTable.vue\`.
        *   **Criteria for New Custom Reusable Components:** Suggest creating a new custom Vue component file (e.g., in \`src/components/featureName/\`) **ONLY IF** a UI segment is:
            *   (a) **Highly complex and specific** in its UI or logic, AND cannot be adequately built by configuring library components.
            *   (b) **Clearly and verifiably reusable across MULTIPLE distinct pages or views** within the application.
        *   If these criteria are NOT met, the UI and logic for that segment should be implemented within the parent view component, using library components directly.
        *   List any **justified** new custom reusable components.

    3.  **Key Features Implementation:**
        *   List the core functionalities to implement (e.g., "Display filterable user data in a table," "Handle form submission for new item creation").
        *   For features involving significant interaction (e.g., a multi-step creation wizard in a dialog), if a custom component is justified per 2.c, mention it here. Otherwise, describe how library components would be orchestrated in the view.

    4.  **API Interaction:**
        *   Briefly outline necessary API calls (e.g., "Fetch item list," "Submit new item form"). Assume usage of project's standard API interaction methods.

    5.  **Styling Approach:**
        *   Reiterate primary reliance on \`${componentLibrary}\` styles.
        *   Note areas likely requiring minimal custom scoped CSS for fine-tuning.

    6.  **Responsiveness:**
        *   Mention any obvious responsive considerations and recommend using library-provided utilities or existing project conventions.
    `;
};
```

### 总结与好处

完成以上步骤后，您的项目将获得以下好处：

1.  **代码更简洁**: 删除了无用的文件和配置，降低了项目的认知负荷。
2.  **配置更清晰**: `.env` 文件只包含实际在使用的变量，避免了混淆。
3.  **Prompt 更健壮**: `initialGenerationPrompt.js` 现在完全动态，能准确反映用户的组件库选择，提高了 AI 生成蓝图的准确性。
4.  **可维护性更高**: 代码和配置的意图更加明确，便于未来的维护和迭代。