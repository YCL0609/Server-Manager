import { exec } from "../lib/runCmd.js";
import { lang, version } from "../lib/init.js";

export class helpTipShow {
    static all() {
        const name = scriptArgs[0].split('/').pop();
        const user = exec('whoami').trim() ?? '[USER]';
        const i18n = lang.helpTipShow;

        print('Server-Manager  version ' + version);
        print(`${i18n.usage}: ${name} [${i18n.option}]...`);
        print(`\n${i18n.detal}\n`);
        print(i18n.option + ':');
        print('  -h, --help           ' + i18n.helpDetal);
        print('  -c, --config <path>  ' + i18n.cfgDetal);
        print('  --sysmon             ' + i18n.sysmonDetal);
        print('  --svrctrl            ' + i18n.srvctlDetal);
        print(`\n${i18n.permission}:`);
        print(`  ${i18n.permDetal}:`);
        print('  ' + user + ' ALL=(ALL) NOPASSWD: /usr/bin/systemctl start *, /usr/bin/systemctl stop *, /usr/bin/systemctl restart *');
    }
}