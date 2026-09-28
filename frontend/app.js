let provider, signer, contract, account, network, isAdmin = false;
const $ = id => document.getElementById(id);
const TARGET_CHAIN_ID = 1337;
const statusNames = ["ACTIVE","EXPIRING SOON","EXPIRED","VOIDED"];

function esc(v){return String(v ?? "").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));}
function short(a){return a ? `${a.slice(0,6)}...${a.slice(-4)}` : "—";}
function fmtDate(x){return new Date(Number(x)*1000).toLocaleDateString(undefined,{day:"2-digit",month:"short",year:"numeric"});}
function fmtDateTime(x){return new Date(Number(x)*1000).toLocaleString(undefined,{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function unixDate(v){return v ? Math.floor(new Date(`${v}T00:00:00`).getTime()/1000) : 0;}
function today(){const d=new Date(), l=new Date(d.getTime()-d.getTimezoneOffset()*60000);return l.toISOString().slice(0,10);}
function daysLeft(exp){return Math.max(0,Math.ceil((Number(exp)-Math.floor(Date.now()/1000))/86400));}
function showMessage(text,type="success"){const e=$("message");e.textContent=text;e.className=`message ${type}`;e.classList.remove("hidden");setTimeout(()=>e.classList.add("hidden"),7000);}
function ensure(){if(!window.WARRANTY_CONTRACT_ADDRESS||!window.WARRANTY_CONTRACT_ABI)throw new Error("Contract is not configured. Run npm run deploy on your persistent Ganache workspace.");}
function statusMeta(w){
  const expiry=Number(w.purchaseDate)+((Number(w.warrantyMonths)+Number(w.extensionMonths))*30*86400);
  if(w.voided)return {key:"voided",label:"VOIDED",expiry,days:0};
  if(Date.now()/1000>expiry)return {key:"expired",label:"EXPIRED",expiry,days:0};
  const days=daysLeft(expiry); if(days<=30)return {key:"soon",label:"EXPIRING SOON",expiry,days};
  return {key:"active",label:"ACTIVE",expiry,days};
}
function badge(w){const s=statusMeta(w);return `<span class="status ${s.key}">${s.label}</span>`;}
function networkLabel(){return `Ganache Local (Chain ${TARGET_CHAIN_ID})`;}

async function connectWallet(silent=false){
  if(!window.ethereum)throw new Error("MetaMask was not detected."); ensure();
  const accounts=await window.ethereum.request({method:silent?"eth_accounts":"eth_requestAccounts"});
  if(!accounts.length)throw new Error("Connect a MetaMask account first.");
  provider=new ethers.BrowserProvider(window.ethereum);
  account=accounts[0].toLowerCase();
  signer=await provider.getSigner(account);
  network=await provider.getNetwork();
  contract=new ethers.Contract(window.WARRANTY_CONTRACT_ADDRESS,window.WARRANTY_CONTRACT_ABI,signer);
  const chainId=Number(network.chainId); $("walletAddress").textContent=short(account);$("networkName").textContent=chainId===TARGET_CHAIN_ID?networkLabel():`Wrong network (Chain ${chainId})`;$('contractAddress').textContent=short(window.WARRANTY_CONTRACT_ADDRESS);
  if(chainId!==TARGET_CHAIN_ID){$("networkWarning").textContent="Switch the connected dApp to Ganache Local (Chain 1337).";$("networkWarning").classList.remove("hidden");return;}
  $("networkWarning").classList.add("hidden");
  isAdmin=(await contract.administrator()).toLowerCase()===account;
  $("walletRole").textContent=isAdmin?"Administrator / Manufacturer":"Customer / Warranty Owner";
  $("roleBadge").textContent=isAdmin?"🛡 ADMIN":"👤 CUSTOMER";$("roleBadge").classList.remove("hidden");
  $("connectHero").classList.add("hidden");$("appShell").classList.remove("hidden");
  await loadProfile(); renderNav(); await renderAll();
  if(!silent)showMessage("Wallet connected to BlockWarranty.");
}
function renderNav(){
  const nav=$("adminTabs");
  nav.innerHTML=isAdmin?`
    <button data-tab="dashboard" class="tab active">Dashboard</button><button data-tab="products" class="tab">Products</button><button data-tab="warranties" class="tab">Warranties</button><button data-tab="claims" class="tab">Claims</button><button data-tab="services" class="tab">Service History</button><button data-tab="activity" class="tab">Blockchain Activity</button><button data-tab="profile" class="tab">Profile</button>`:`
    <button data-tab="dashboard" class="tab active">Dashboard</button><button data-tab="products" class="tab">My Products</button><button data-tab="warranties" class="tab">Verify Warranty</button><button data-tab="claims" class="tab">My Claims</button><button data-tab="services" class="tab">Service History</button><button data-tab="activity" class="tab">Blockchain Activity</button><button data-tab="profile" class="tab">Profile</button>`;
  nav.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{nav.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));$(b.dataset.tab).classList.add("active");}));
}
async function loadProfile(){const p=await contract.getProfile(account);$("accountName").textContent=p.name||short(account);}
async function getIds(){return Array.from(await contract.getAllProductIds(),x=>Number(x));}
async function getWarranty(id){return await contract.getWarranty(id);}
async function allWarranties(){const ids=await getIds();const out=[];for(const id of ids){try{out.push(await getWarranty(id));}catch{}}return out;}

async function renderAll(){await renderDashboard();await renderProducts();await renderWarranties();await renderClaims();await renderServices();await renderActivity();await renderProfile();}

async function renderDashboard(){
  const ws=await allWarranties(); const active=ws.filter(w=>statusMeta(w).key==="active"||statusMeta(w).key==="soon").length;const expired=ws.filter(w=>statusMeta(w).key==="expired").length;const voided=ws.filter(w=>statusMeta(w).key==="voided").length;
  if(isAdmin){
    $("dashboard").innerHTML=`<div class="grid"><div class="span-12 panel card"><div class="section-head"><div><span class="eyebrow">MANUFACTURER CONTROL CENTER</span><h2>Admin Dashboard</h2><p class="muted">Issue warranties, manage lifecycle actions and oversee customer claims.</p></div><span class="role-badge">🛡 Administrator</span></div><div class="stats"><div class="stat"><span class="label">Products</span><strong>${ws.length}</strong></div><div class="stat"><span class="label">Active</span><strong>${active}</strong></div><div class="stat"><span class="label">Expired</span><strong>${expired}</strong></div><div class="stat"><span class="label">Voided</span><strong>${voided}</strong></div></div></div><div class="span-8 panel card"><h3>Register warranty</h3><p class="muted">Create the initial blockchain warranty record for a product and its owner.</p>${registrationForm()}</div><div class="span-4 panel card"><h3>Admin actions</h3><p class="muted">These controls are protected by the smart contract administrator role.</p><div class="form-actions"><button class="primary" onclick="openVoidForm()">Void warranty</button><button class="secondary" onclick="openExtensionForm()">Extend warranty</button></div><p class="note">The UI hides these actions for customers, but the Solidity contract also enforces administrator authorization.</p></div></div>`;
  } else {
    const mine=[];for(const w of ws)if(w.owner.toLowerCase()===account)mine.push(w);const soon=mine.filter(w=>statusMeta(w).key==="soon").length;
    $("dashboard").innerHTML=`<div class="grid"><div class="span-12 panel card"><div class="section-head"><div><span class="eyebrow">CUSTOMER PORTAL</span><h2>Welcome, ${esc($("accountName").textContent)}</h2><p class="muted">Your wallet is your ownership identity. View, transfer and claim warranties you own.</p></div><span class="role-badge">👤 Customer</span></div><div class="stats"><div class="stat"><span class="label">My Products</span><strong>${mine.length}</strong></div><div class="stat"><span class="label">Active</span><strong>${activeFor(mine)}</strong></div><div class="stat"><span class="label">Expiring Soon</span><strong>${soon}</strong></div><div class="stat"><span class="label">Voided / Expired</span><strong>${mine.length-activeFor(mine)}</strong></div></div></div><div class="span-12 panel card"><div class="section-head"><div><h3>My Product Dashboard</h3><p class="muted">Your current warranty portfolio.</p></div><button class="secondary" onclick="activateTab('products')">View all</button></div><div class="product-grid">${mine.slice(0,6).map(productCard).join("")||`<div class="empty span-12">No warranties belong to this wallet yet.</div>`}</div></div></div>`;
  }
}
function activeFor(ws){return ws.filter(w=>["active","soon"].includes(statusMeta(w).key)).length;}
function registrationForm(){return `<div class="form-grid"><label>Product name<input id="rProduct" placeholder="Lenovo LOQ Laptop"></label><label>Serial number<input id="rSerial" placeholder="LOQ-2026-001"></label><label>Owner name<input id="rOwner" placeholder="Customer name"></label><label>Owner wallet address<input id="rOwnerWallet" placeholder="0x..."></label><label>Purchase date<input id="rPurchase" type="date" value="${today()}"></label><label>Warranty period (months)<input id="rMonths" type="number" min="1" value="24"></label><label>Billing address<input id="rBilling" placeholder="Full billing address"></label></div><div class="form-actions"><button class="primary" onclick="registerWarranty()">Register on Blockchain</button></div>`;}
async function registerWarrantyImpl(){
  const product=$("rProduct").value.trim(),serial=$("rSerial").value.trim(),owner=$("rOwner").value.trim(),ownerWallet=$("rOwnerWallet").value.trim(),billing=$("rBilling").value.trim(),purchase=unixDate($("rPurchase").value),months=Number($("rMonths").value);if(!product||!serial||!owner||!ethers.isAddress(ownerWallet)||!billing||!purchase||!months)throw new Error("Complete all registration fields and enter a valid owner wallet address.");
  showMessage("Waiting for MetaMask confirmation...","success");const tx=await contract.registerWarranty(product,serial,owner,ownerWallet,billing,purchase,months);await tx.wait();showMessage("Warranty registered successfully.");await renderAll();}

function productCard(w){const s=statusMeta(w);const transferAllowed=!isAdmin&&w.owner.toLowerCase()===account&&s.key!=='voided'&&s.key!=='expired';return `<article class="product-card"><span class="label">Product #${w.productId}</span><h3>${esc(w.productName)}</h3>${badge(w)}<div class="product-meta"><div><b>Serial:</b> ${esc(w.serialNumber)}</div><div><b>Owner:</b> ${esc(w.ownerName)}</div><div><b>Expires:</b> ${fmtDate(s.expiry)}</div><div><b>Remaining:</b> ${s.key==='voided'||s.key==='expired'?'—':s.days+' days'}</div></div><div class="form-actions"><button class="secondary" onclick="verifyAndShow(${Number(w.productId)})">View details</button>${transferAllowed?`<button class="primary" onclick="openTransferForm(${Number(w.productId)})">Transfer Warranty</button>`:''}</div></article>`;}

async function renderProducts(){
  const ws=await allWarranties();const visible=isAdmin?ws:ws.filter(w=>w.owner.toLowerCase()===account);
  $("products").innerHTML=`<div class="panel card"><div class="section-head"><div><span class="eyebrow">PRODUCT DASHBOARD</span><h2>${isAdmin?'All registered products':'My warranties'}</h2><p class="muted">Automatic status is calculated from purchase date, warranty duration, extensions and void state.</p></div>${isAdmin?'<button class="primary" onclick="activateTab(\'dashboard\')">+ Register</button>':''}</div><div class="product-grid">${visible.map(productCard).join("")||'<div class="empty">No products found.</div>'}</div></div>`;
}

async function renderWarranties(){
  $("warranties").innerHTML=`<div class="grid"><div class="span-6 panel card"><div class="section-head"><div><span class="eyebrow">VERIFY</span><h2>Warranty lookup</h2><p class="muted">Search by on-chain product ID.</p></div></div><div class="form-actions"><input id="verifyInput" type="number" min="1" placeholder="Product ID"><button class="primary" onclick="verifyAndShow(Number($(\'verifyInput\').value))">Verify</button></div><div id="verifyResult"></div></div><div class="span-6 panel card"><h3>Warranty lifecycle</h3><p class="muted">Every product moves through a traceable lifecycle.</p><div class="timeline"><div class="timeline-item"><strong>Registered</strong><small>Product and purchase information committed on-chain.</small></div><div class="timeline-item"><strong>Active / Expiring Soon</strong><small>Status updates automatically as time passes.</small></div><div class="timeline-item"><strong>Transferred</strong><small>Current owner can transfer the warranty to another wallet.</small></div><div class="timeline-item"><strong>Claim / Service</strong><small>Owner can raise a claim; administrator records service outcomes.</small></div><div class="timeline-item"><strong>Extended / Expired / Voided</strong><small>Administrator may extend or void; time can cause automatic expiry.</small></div></div></div></div>`;
}
async function verifyAndShow(id){
  if(!id)return showMessage("Enter a product ID.","error");
  try{
    const w=await getWarranty(id),s=statusMeta(w),p=await contract.getProfile(w.owner),claims=await contract.getClaims(id),services=await contract.getServiceHistory(id);
    const ownerDisplay=p.name||w.ownerName;
    const transferButton=!isAdmin&&w.owner.toLowerCase()===account&&s.key!=="voided"&&s.key!=="expired"?`<button class="primary" onclick="openTransferForm(${Number(id)})">Transfer Warranty</button>`:"";
    const html=`<div class="panel card" style="margin-top:15px"><div class="section-head"><div><span class="eyebrow">PRODUCT #${id}</span><h3>${esc(w.productName)}</h3></div>${badge(w)}</div><div class="detail"><div><span>Serial</span><strong>${esc(w.serialNumber)}</strong></div><div><span>Owner</span><strong>${esc(ownerDisplay)}</strong></div><div><span>Wallet</span><strong>${esc(short(w.owner))}</strong></div><div><span>Purchase date</span><strong>${fmtDate(w.purchaseDate)}</strong></div><div><span>Expiration</span><strong>${fmtDate(s.expiry)}</strong></div><div><span>Remaining</span><strong>${s.key==='voided'||s.key==='expired'?'0':s.days+' days'}</strong></div><div><span>Original warranty</span><strong>${w.warrantyMonths} months</strong></div><div><span>Extension</span><strong>${w.extensionMonths} months</strong></div><div><span>Billing address</span><strong>${esc(w.billingAddress)}</strong></div><div><span>Claims</span><strong>${claims.length}</strong></div><div><span>Service records</span><strong>${services.length}</strong></div><div><span>Status</span><strong>${s.label}${w.voided?' — '+esc(w.voidReason):''}</strong></div></div>${ownerDisplay?`<p class="note">Profile: ${esc(ownerDisplay)}${p.email?' • '+esc(p.email):''}${p.phone?' • '+esc(p.phone):''}</p>`:''}<div class="form-actions"><button class="secondary" onclick="activateTab('products')">Back to My Products</button>${transferButton}</div></div>`;
    activateTab('warranties');
    const target=$("verifyResult");
    if(target)target.innerHTML=html;
  }catch(e){showMessage(e.reason||e.shortMessage||e.message,"error");}
}

async function openTransferForm(productId){
  try{
    const w=await getWarranty(productId);
    if(isAdmin||w.owner.toLowerCase()!==account)throw new Error("Only the current warranty owner can transfer this product.");
    const s=statusMeta(w);
    if(s.key==='voided'||s.key==='expired')throw new Error("This warranty is not transferable because it is no longer valid.");
    const p=await contract.getProfile(w.owner);
    openModal(`<h2>Transfer warranty</h2><p class="muted">Transfer <b>Product #${Number(productId)} — ${esc(w.productName)}</b> to another Ganache wallet.</p><div class="form-grid"><label>Current owner<input value="${esc(p.name||w.ownerName)}" disabled></label><label>Product ID<input value="#${Number(productId)}" disabled></label><label class="full">New owner wallet address<input id="tOwnerWallet" placeholder="0x..." autocomplete="off"></label><label>New owner name<input id="tOwnerName" placeholder="Customer 3"></label><label>New billing address<input id="tBilling" placeholder="Pune, Maharashtra"></label></div><p class="note">The new wallet must be a different valid Ganache account. MetaMask will ask you to confirm the blockchain transaction.</p><div class="form-actions"><button class="primary" onclick="transferWarranty(${Number(productId)})">Transfer Warranty</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`);
  }catch(e){showMessage(e.reason||e.shortMessage||e.message,"error");}
}
async function transferWarranty(productId){
  try{
    const newOwner=$("tOwnerWallet").value.trim(),newName=$("tOwnerName").value.trim(),billing=$("tBilling").value.trim();
    if(!ethers.isAddress(newOwner))throw new Error("Enter a valid new owner wallet address.");
    if(newOwner.toLowerCase()===account)throw new Error("New owner must be a different wallet.");
    if(!newName||!billing)throw new Error("New owner name and billing address are required.");
    showMessage("Waiting for MetaMask confirmation...","success");
    const tx=await contract.transferWarranty(productId,newOwner,newName,billing);
    await tx.wait();
    closeModal();
    showMessage("Warranty ownership transferred successfully.");
    await renderAll();
  }catch(e){showMessage(e.reason||e.shortMessage||e.message,"error");}
}

async function renderClaims(){
  if(isAdmin){const claims=await contract.getAllClaims();$("claims").innerHTML=`<div class="panel card"><div class="section-head"><div><span class="eyebrow">WARRANTY CLAIMS</span><h2>Claims management</h2><p class="muted">Review customer issues and record approval, rejection or completion on-chain.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Claim</th><th>Product</th><th>Customer</th><th>Issue</th><th>Status</th><th>Action</th></tr></thead><tbody>${claims.length?claims.map(c=>claimRow(c,true)).join(""):'<tr><td colspan="6">No claims yet.</td></tr>'}</tbody></table></div></div>`;}
  else {const ws=await allWarranties();let claims=[];for(const w of ws.filter(x=>x.owner.toLowerCase()===account)){const cs=await contract.getClaims(w.productId);claims=claims.concat(cs.map(c=>({c,w})));}$("claims").innerHTML=`<div class="panel card"><div class="section-head"><div><span class="eyebrow">MY CLAIMS</span><h2>Warranty claims</h2><p class="muted">Submit an issue for one of your active warranties.</p></div><button class="primary" onclick="openClaimForm()">+ New claim</button></div><div class="table-wrap"><table class="table"><thead><tr><th>Claim</th><th>Product</th><th>Issue</th><th>Status</th><th>Created</th></tr></thead><tbody>${claims.length?claims.map(x=>claimRow(x.c,false,x.w)).join(""):'<tr><td colspan="5">No claims yet.</td></tr>'}</tbody></table></div></div>`;}
}
function claimRow(c,admin,w){const names=["Pending","Approved","Rejected","Completed"];return `<tr><td>#${c.claimId}</td><td>#${c.productId}${w?' · '+esc(w.productName):''}</td><td><b>${esc(c.issue)}</b><br><span class="muted">${esc(c.description)}</span></td><td>${names[Number(c.status)]}</td><td>${admin?`<select id="claimStatus-${c.claimId}"><option value="1">Approve</option><option value="2">Reject</option><option value="3">Complete</option></select><button class="secondary" onclick="updateClaim(${c.productId},${c.claimId})">Save</button>`:fmtDateTime(c.createdAt)}</td></tr>`;}
async function openClaimFormImpl(){const ws=(await allWarranties()).filter(w=>w.owner.toLowerCase()===account&&['active','soon'].includes(statusMeta(w).key));if(!ws.length)return showMessage("You have no active warranty available for a claim.","error");openModal(`<h2>Submit warranty claim</h2><div class="form-grid"><label>Product<select id="cProduct">${ws.map(w=>`<option value="${w.productId}">#${w.productId} — ${esc(w.productName)}</option>`).join("")}</select></label><label>Issue<input id="cIssue" placeholder="Display flickering"></label><label class="full">Description<textarea id="cDesc" rows="4" placeholder="Describe the problem and circumstances"></textarea></label></div><div class="form-actions"><button class="primary" onclick="submitClaim()">Submit claim</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`);}
async function submitClaimImpl(){const id=Number($("cProduct").value),issue=$("cIssue").value.trim(),desc=$("cDesc").value.trim();if(!issue||!desc)throw new Error("Complete the claim fields.");const tx=await contract.submitClaim(id,issue,desc);await tx.wait();closeModal();showMessage("Warranty claim submitted on-chain.");await renderAll();}
async function updateClaim(productId,claimId){const status=Number($("claimStatus-"+claimId).value);const note=status===1?"Claim approved by administrator":status===2?"Claim rejected by administrator":"Service/claim completed";const tx=await contract.updateClaimStatus(productId,claimId,status,note);await tx.wait();showMessage("Claim status updated on-chain.");await renderAll();}

async function renderServices(){
  const ws=await allWarranties();const visible=isAdmin?ws:ws.filter(w=>w.owner.toLowerCase()===account);let records=[];for(const w of visible){const rs=await contract.getServiceHistory(w.productId);for(const r of rs)records.push({w,r});}
  $("services").innerHTML=`<div class="panel card"><div class="section-head"><div><span class="eyebrow">SERVICE HISTORY</span><h2>${isAdmin?'Warranty service records':'My product service history'}</h2><p class="muted">Repairs and maintenance become part of the product's lifecycle.</p></div>${isAdmin?'<button class="primary" onclick="openServiceForm()">+ Add service record</button>':''}</div>${records.length?`<div class="timeline">${records.reverse().map(({w,r})=>`<div class="timeline-item"><strong>Product #${w.productId} · ${esc(w.productName)}</strong><div>${esc(r.serviceCenter)} — ${esc(r.workPerformed)}</div><small>${fmtDate(r.serviceDate)} · Diagnosis: ${esc(r.diagnosis)} · Record #${r.serviceId}</small></div>`).join("")}</div>`:'<div class="empty">No service records yet.</div>'}</div>`;
}
async function openServiceFormImpl(){const ws=await allWarranties();openModal(`<h2>Add service record</h2><div class="form-grid"><label>Product<select id="sProduct">${ws.map(w=>`<option value="${w.productId}">#${w.productId} — ${esc(w.productName)}</option>`).join("")}</select></label><label>Service date<input id="sDate" type="date" value="${today()}"></label><label>Service center<input id="sCenter" placeholder="ABC Electronics Service Center"></label><label>Diagnosis<input id="sDiagnosis" placeholder="Display panel fault"></label><label class="full">Work performed<textarea id="sWork" rows="3" placeholder="Replaced display panel"></textarea></label></div><div class="form-actions"><button class="primary" onclick="addService()">Record service</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`);}
async function addServiceImpl(){const id=Number($("sProduct").value),date=unixDate($("sDate").value),center=$("sCenter").value.trim(),diag=$("sDiagnosis").value.trim(),work=$("sWork").value.trim();if(!center||!diag||!work||!date)throw new Error("Complete service record fields.");const tx=await contract.addServiceRecord(id,center,diag,work,date);await tx.wait();closeModal();showMessage("Service record added on-chain.");await renderAll();}

async function renderActivity(){
  const list=[];for(const eventName of ["WarrantyRegistered","WarrantyTransferred","WarrantyVoided","WarrantyExtended","ClaimSubmitted","ClaimStatusChanged","ServiceRecordAdded","ProfileUpdated"]){try{const f=contract.filters[eventName]();const logs=await contract.queryFilter(f,0,"latest");for(const log of logs){let parsed;try{parsed=contract.interface.parseLog(log)}catch{continue}const block=await provider.getBlock(log.blockNumber);list.push({eventName,parsed,log,block})}}catch(e){console.warn(eventName,e)}}
  list.sort((a,b)=>Number(b.log.blockNumber)-Number(a.log.blockNumber)||Number(b.log.index)-Number(a.log.index));$("activity").innerHTML=`<div class="panel card"><div class="section-head"><div><span class="eyebrow">ON-CHAIN AUDIT TRAIL</span><h2>Blockchain Activity</h2><p class="muted">Live smart-contract events from Ganache Local.</p></div><button class="secondary" onclick="renderActivity()">Refresh</button></div><div class="activity">${list.length?list.slice(0,100).map(activityRow).join(""):'<div class="empty">No blockchain events yet.</div>'}</div></div>`;
}
function activityRow(x){const a=x.parsed.args;let title=x.eventName;let detail=`Product #${a.productId??''}`;if(x.eventName==='WarrantyRegistered')title='Warranty registered',detail=`${esc(a.productName)} · Owner: ${esc(a.ownerName)}`;if(x.eventName==='WarrantyTransferred')title='Warranty transferred',detail=`${esc(a.previousOwnerName)} → ${esc(a.newOwnerName)}`;if(x.eventName==='WarrantyVoided')title='Warranty voided',detail=esc(a.reason);if(x.eventName==='WarrantyExtended')title='Warranty extended',detail=`+${a.addedMonths} months · ${esc(a.reason)}`;if(x.eventName==='ClaimSubmitted')title='Claim submitted',detail=`Claim #${a.claimId} · ${esc(a.issue)}`;if(x.eventName==='ClaimStatusChanged')title='Claim status changed',detail=`Claim #${a.claimId} · Status ${a.status}`;if(x.eventName==='ServiceRecordAdded')title='Service record added',detail=`Service #${a.serviceId} · ${esc(a.serviceCenter)}`;if(x.eventName==='ProfileUpdated')title='Profile updated',detail=`${esc(a.name)}`;return `<div class="activity-row"><div class="activity-type">${esc(title)}</div><div><div class="activity-title">${detail}</div><div class="activity-meta">Block ${x.log.blockNumber} · ${fmtDateTime(x.block.timestamp)}</div></div><div class="hash">${short(x.log.transactionHash)}</div></div>`;}

async function renderProfile(){const p=await contract.getProfile(account);$("profile").innerHTML=`<div class="grid"><div class="span-6 panel card"><div class="section-head"><div><span class="eyebrow">ACCOUNT PROFILE</span><h2>${isAdmin?'Manufacturer profile':'Customer profile'}</h2><p class="muted">The profile name is shown alongside the wallet address to make blockchain records human-readable.</p></div></div><div class="form-grid"><label>Name<input id="pName" value="${esc(p.name)}" placeholder="Full name"></label><label>Email<input id="pEmail" type="email" value="${esc(p.email)}" placeholder="name@example.com"></label><label>Phone<input id="pPhone" value="${esc(p.phone)}" placeholder="+91..."></label><label>Address<input id="pAddress" value="${esc(p.addressLine)}" placeholder="Billing / contact address"></label></div><div class="form-actions"><button class="primary" onclick="saveProfile()">Save profile on blockchain</button></div></div><div class="span-6 panel card"><span class="eyebrow">IDENTITY</span><h2>${esc(p.name||short(account))}</h2><p class="muted">${isAdmin?'🛡 Administrator / Manufacturer':'👤 Customer'}</p><div class="detail"><div><span>Wallet</span><strong>${esc(account)}</strong></div><div><span>Network</span><strong>Ganache Local · 1337</strong></div><div><span>Contract</span><strong>${esc(window.WARRANTY_CONTRACT_ADDRESS)}</strong></div></div></div></div>`;}
async function saveProfileImpl(){const n=$("pName").value.trim(),e=$("pEmail").value.trim(),ph=$("pPhone").value.trim(),a=$("pAddress").value.trim();if(!n)throw new Error("Name is required.");const tx=await contract.setProfile(n,e,ph,a);await tx.wait();showMessage("Profile saved on-chain.");await loadProfile();await renderAll();}

function openVoidForm(){openModal(`<h2>Void warranty</h2><p class="muted">This is an administrator-only lifecycle action.</p><div class="form-grid"><label>Product ID<input id="vProduct" type="number" min="1"></label><label class="full">Reason<textarea id="vReason" rows="4" placeholder="Unauthorized repair, liquid damage, serial tampering..."></textarea></label></div><div class="form-actions"><button class="danger" onclick="voidWarranty()">Void warranty</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`);}
async function voidWarrantyImpl(){const id=Number($("vProduct").value),reason=$("vReason").value.trim();if(!id||!reason)throw new Error("Product ID and reason are required.");const tx=await contract.voidWarranty(id,reason);await tx.wait();closeModal();showMessage("Warranty voided on-chain.");await renderAll();}
function openExtensionForm(){openModal(`<h2>Extend warranty</h2><div class="form-grid"><label>Product ID<input id="eProduct" type="number" min="1"></label><label>Additional months<input id="eMonths" type="number" min="1" value="6"></label><label class="full">Reason<input id="eReason" placeholder="Goodwill extension / service recovery"></label></div><div class="form-actions"><button class="primary" onclick="extendWarranty()">Extend warranty</button><button class="secondary" onclick="closeModal()">Cancel</button></div>`);}
async function extendWarrantyImpl(){const id=Number($("eProduct").value),months=Number($("eMonths").value),reason=$("eReason").value.trim();if(!id||!months)throw new Error("Product ID and months are required.");const tx=await contract.extendWarranty(id,months,reason);await tx.wait();closeModal();showMessage("Warranty extended on-chain.");await renderAll();}
function openModal(content){const b=document.createElement('div');b.id='modalRoot';b.className='modal-backdrop';b.innerHTML=`<div class="modal">${content}</div>`;document.body.appendChild(b);}
function closeModal(){document.getElementById('modalRoot')?.remove();}
function activateTab(id){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.toggle('active',x.id===id));}

window.registerWarranty=()=>registerWarrantyImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.verifyAndShow=verifyAndShow;window.openTransferForm=openTransferForm;window.transferWarranty=transferWarranty;window.openClaimForm=()=>openClaimFormImpl().catch(e=>showMessage(e.message,"error"));window.submitClaim=()=>submitClaimImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.updateClaim=updateClaim;window.openServiceForm=()=>openServiceFormImpl().catch(e=>showMessage(e.message,"error"));window.addService=()=>addServiceImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.openVoidForm=openVoidForm;window.voidWarranty=()=>voidWarrantyImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.openExtensionForm=openExtensionForm;window.extendWarranty=()=>extendWarrantyImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.saveProfile=()=>saveProfileImpl().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error"));window.closeModal=closeModal;window.activateTab=activateTab;

$("connectButton").addEventListener("click",()=>connectWallet().catch(e=>showMessage(e.reason||e.shortMessage||e.message,"error")));
if(window.ethereum){
  window.ethereum.on("accountsChanged",async (accounts)=>{
    if(!accounts.length){location.reload();return;}
    try{await connectWallet(true);}catch(e){showMessage(e.reason||e.shortMessage||e.message,"error");}
  });
  window.ethereum.on("chainChanged",()=>location.reload());
}
