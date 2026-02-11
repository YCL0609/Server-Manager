import { writeFile } from "./lib/writeFile.js";

writeFile('/dev/shm/servicesControl', `srvControl|${Date.now()}|nginx.service|restart`,'w')