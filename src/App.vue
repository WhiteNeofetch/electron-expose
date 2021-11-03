<template>
  <div id="app" class="p-4">
    <div>
        <div class="flex justify-between">
            <label for="host" class="block text-sm font-medium leading-5 text-gray-700">Which site do you want to expose?</label>
            <a href="#" 
            v-if="! tokenVisible"
            class="text-sm font-medium text-gray-700"
            @click.prevent="showToken">Configure</a>
            <a href="#" 
            v-else
            class="text-sm font-medium text-gray-700"
            @click.prevent="hideToken">Close</a>
        </div>
        <div class="mt-1 flex rounded-md shadow-sm" v-if="! tokenVisible">
          <div class="relative flex-grow focus-within:z-10">
              <input 
              v-model="host"
              @keyup.enter="shareSite"
              class="focus:outline-none form-input block w-full rounded-none rounded-l-md transition ease-in-out duration-150 sm:text-sm sm:leading-5" 
              placeholder="local-site.test" />
          </div>
          <button 
          @click="shareSite"
          class="focus:outline-none -ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm leading-5 font-medium rounded-r-md text-gray-700 bg-gray-50 hover:text-gray-500 hover:bg-white focus:outline-none focus:shadow-outline-blue focus:border-blue-300 active:bg-gray-100 active:text-gray-700 transition ease-in-out duration-150">
              <span>Share</span>
          </button>
        </div>
        <div class="mt-1 flex rounded-md shadow-sm" v-else>
          <div class="relative flex-grow focus-within:z-10">
              <input 
              v-model="token"
              id="token" 
              @keyup.enter="saveExposeToken"
              class="focus:outline-none form-input block w-full rounded-none rounded-l-md transition ease-in-out duration-150 sm:text-sm sm:leading-5" 
              placeholder="YOUR-EXPOSE-TOKEN" />
          </div>
          <button 
          @click="saveExposeToken"
          class="focus:outline-none -ml-px relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm leading-5 font-medium rounded-r-md text-gray-700 bg-gray-50 hover:text-gray-500 hover:bg-white focus:outline-none focus:shadow-outline-blue focus:border-blue-300 active:bg-gray-100 active:text-gray-700 transition ease-in-out duration-150">
              <span>Save Token</span>
          </button>
        </div>
    </div>
    <div class="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
      <ul>
        <li v-for="(site, index) in sites" :key="index" class="select-none">
          <a 
          @click.right="openContextMenu(site)"
          @click.prevent="openExposeUrl(site)"
          href="#" class="user-select-none block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition duration-150 ease-in-out">
            <div class="px-4 py-4 flex items-center sm:px-6">
              <div class="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm leading-5 font-medium text-indigo-600 truncate">
                    {{ site.localUrl }}<br />
                    <span class="text-gray-800 text-sm">{{ site.exposeUrl }}</span>
                  </div>
                </div>
              </div>
              <div class="ml-5 flex-shrink-0">
                <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { spawn, execSync } from 'child_process';
import { remote, ipcRenderer } from 'electron';
import { resolve } from 'path';

const { Menu, MenuItem } = remote;
const extraPath = resolve(remote.app.getAppPath(), "../extra");

export default {
  name: 'App',
  data() {
    return {
      token: '',
      tokenVisible: false,
      host: '',
      sites: [],
      processes: {}
    }
  },
  methods: {
    openContextMenu(site) {
      const menu = new Menu();

      menu.append(new MenuItem({
        label: 'Open local site',
        click: () => remote.shell.openExternal(`http://${site.localUrl}`)
      }));

      menu.append(new MenuItem({
        label: 'Open dashboard',
        click: () => remote.shell.openExternal(site.dashboardUrl)
      }));

      menu.append(new MenuItem({
        type: 'separator'
      }));

      menu.append(new MenuItem({
        label: 'Disconnect',
        click: () => this.disconnectSite(site)
      }));

      menu.popup({ window: remote.getCurrentWindow() })
    },

    disconnectSite(site) {
      this.processes[site.host].kill();

      delete this.processes[site.host];

      this.sites.splice(this.sites.indexOf(site), 1);
    },

    showToken() {
      this.tokenVisible = true;
    },

    hideToken() {
      this.tokenVisible = false;
    },

    detectExposeToken() {
      try {
        let token = execSync(`php ${extraPath}/expose token`).toString();

        // We need to strip out \n and "Current authentication token: "
        token = token.replace("\n", "");
        token = token.replace("Current authentication token: ", "");

        this.token = token;
      } catch (err) {
        alert(err);
      }
    },

    saveExposeToken() {
      execSync(`php ${extraPath}/expose token ${this.token}`)

      this.detectExposeToken();
    },

    openExposeUrl(site) {
      remote.shell.openExternal(site.exposeUrl);
    },

    shareSite() {
      const process = spawn(`php ${extraPath}/expose share ${this.host}`, {
        shell: true,
      });

      this.processes[this.host] = process;

      process.stderr.on('data', (data) => {
        console.error(data.toString());
      })

      process.stdout.on('data', (data) => {
        let match;
        let buffer = data.toString();

        let site = {
          host: this.host,
          localUrl: null,
          dashboardUrl: null,
          exposeUrl: null,
        }
        
        let regex = /^Local-URL:\s+(.*)$/gm;
        if ((match = regex.exec(buffer)) !== null) {
          site.localUrl = match[1];
        }
        
        regex = /^Dashboard-URL:\s+(.*)$/gm;
        if ((match = regex.exec(buffer)) !== null) {
          site.dashboardUrl = match[1];
        }
        
        regex = /^Expose-URL:\s+(.*)$/gm;
        if ((match = regex.exec(buffer)) !== null) {
          site.exposeUrl = match[1];
        }

        if (site.dashboardUrl !== null && site.localUrl !== null && site.exposeUrl !== null) {
          this.sites.push(site);
          this.host = '';
        }

      })
    },
    killProcesses() {
      for (const exposeProcess of Object.values(this.processes)) {
        exposeProcess.kill();
      }
    }
  },
  mounted() {
    
    this.detectExposeToken();

    /**
     * If the user does not yet have an expose token configured
     * show the token input field.
     */
    if (this.token === '') {
      this.showToken = true;
    }

    /**
     * When the user tries to quit the app via the
     * context menu, we first need to kill all
     * expose processes.
     * 
     * Afterwards we quit the application.
     */
    ipcRenderer.on('killProcesses', () => {
      this.killProcesses();

      remote.app.quit();
    });
  }
}
</script>

<style src="./assets/tailwind.css"></style>