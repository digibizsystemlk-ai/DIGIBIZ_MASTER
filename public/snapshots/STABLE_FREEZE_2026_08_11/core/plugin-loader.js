// Plugin Loader System - Core Module
// මෙය ස්වයංක්‍රීයව plugins load කරනවා

class PluginLoader {
    constructor() {
        this.loadedPlugins = new Map();
        this.pluginStatus = new Map();
        this.pluginClasses = new Map();
        this.pluginConfigs = new Map();
    }

    // Plugin එකක් register කරන්න
    registerPlugin(pluginClass, config = {}) {
        const pluginName = pluginClass.name;
        
        if (this.loadedPlugins.has(pluginName)) {
            console.warn(`⚠️ Plugin ${pluginName} already loaded`);
            return;
        }

        try {
            this.pluginClasses.set(pluginName, pluginClass);
            this.pluginConfigs.set(pluginName, config);
            const pluginInstance = new pluginClass(window.eventBus, config);
            this.loadedPlugins.set(pluginName, pluginInstance);
            this.pluginStatus.set(pluginName, 'active');
            console.log(`✅ Plugin Loaded: ${pluginName}`);
            
            // Plugin එක initialize කරන්න (එහි init method එකක් තියෙනවා නම්)
            if (typeof pluginInstance.init === 'function') {
                pluginInstance.init();
            }
            
            return pluginInstance;
        } catch (error) {
            console.error(`❌ Failed to load plugin ${pluginName}:`, error);
            this.pluginStatus.set(pluginName, 'failed');
        }
    }

    // Plugin එකක් disable කරන්න
    disablePlugin(pluginName) {
        if (this.loadedPlugins.has(pluginName)) {
            const plugin = this.loadedPlugins.get(pluginName);
            if (typeof plugin.destroy === 'function') {
                plugin.destroy();
            }
            this.pluginStatus.set(pluginName, 'disabled');
            console.log(`🔇 Plugin Disabled: ${pluginName}`);
        }
    }

    // Plugin එකක් enable කරන්න
    enablePlugin(pluginName) {
        if (this.pluginStatus.get(pluginName) === 'disabled') {
            const plugin = this.loadedPlugins.get(pluginName);
            if (plugin && typeof plugin.init === 'function') {
                plugin.init();
                this.pluginStatus.set(pluginName, 'active');
                console.log(`🔊 Plugin Enabled: ${pluginName}`);
                return;
            }

            const pluginClass = this.pluginClasses.get(pluginName);
            if (!pluginClass) {
                console.warn(`⚠️ Plugin class not found for: ${pluginName}`);
                return;
            }

            const config = this.pluginConfigs.get(pluginName) || {};
            this.loadedPlugins.delete(pluginName);
            this.registerPlugin(pluginClass, config);
        }
    }

    // Loaded plugins list එක බලන්න
    getLoadedPlugins() {
        return Array.from(this.loadedPlugins.keys()).map(name => ({
            name: name,
            status: this.pluginStatus.get(name)
        }));
    }
}

// Global Plugin Loader instance එකක් හදන්න
window.pluginLoader = new PluginLoader();

// Auto-load plugins from window.DIGIBIZ_PLUGINS
document.addEventListener('DOMContentLoaded', () => {
    const plugins = window.DIGIBIZ_PLUGINS || [];
    plugins.forEach(plugin => {
        window.pluginLoader.registerPlugin(plugin);
    });
    console.log(`🎯 Plugin Loader initialized. ${plugins.length} plugins registered.`);
});

console.log('✅ Plugin Loader System Initialized');