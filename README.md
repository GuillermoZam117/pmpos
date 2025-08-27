# PMPOS
Reactjs based WebPOS Project for SambaPOS

#Installation
- Install NodeJS (https://nodejs.org/)
- Install Git and choose Use Git from the Windows Command Prompt option: (https://git-scm.com)
- run `git clone https://github.com/sambapos/pmpos.git` command to download project. 
- run `npm install` command under project folder to install libraries.
- `npm run start` will start dev server on 8080 port.
- `npm run build` will build for production. 

#Configuration
- Edit `app > config.js` and set `terminalName`, `userName`, `departmentName`, `ticketTypeName`, `menuName`, `entityScreenName`, etc. to coincide with your SambaPOS configuration.
- Note on `userName`: the runtime terminal registration uses the PIN-authenticated user from the login flow. `SAMBAPOS_USERNAME` in `.env` is only a fallback for diagnostics and should not be relied upon in production.

#Guides
- Terminal Ticket Flow (GraphQL, tested payloads and responses): see `docs/Guia_Flujo_Terminal.md`.

#Contributors
Emre Eren (https://github.com/emreeren)  
Jesse Parker (https://github.com/kendash)  
Q McKay (https://github.com/QTMcKay)  
