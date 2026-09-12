import assert from 'node:assert/strict';

const target=new URL(process.env.VOICE_WEBSITE_URL??'http://127.0.0.1:5187/voice/');
export const publicVerification=target.origin==='https://agent-orchestrator.dev';
const loopback=['127.0.0.1','localhost','[::1]'].includes(target.hostname);
assert(publicVerification||loopback,'Verification target must be loopback or the Voice ecosystem website.');
assert(['http:','https:'].includes(target.protocol)&&target.pathname==='/voice/'&&!target.username&&!target.password&&!target.search&&!target.hash,'Use the /voice/ base URL without credentials, query or fragment.');
export const websiteVerificationBase=target.href;
export const websiteVerificationDirectory=publicVerification?'voice-website-public':'voice-website';
