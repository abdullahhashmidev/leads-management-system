import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".sql"]);
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.has(name.slice(name.lastIndexOf(".")))) out.push(p);
  }
  return out;
}

const secrets = [];
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
    if (/KEY|SECRET|TOKEN|PASSWORD/i.test(k) && v.length >= 8) secrets.push(v);
  }
}
const PATTERNS = [/gsk_[A-Za-z0-9]{20,}/g, /sk-[A-Za-z0-9_-]{20,}/g, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g];
function redact(s) {
  for (const v of secrets) s = s.split(v).join("[REDACTED]");
  for (const re of PATTERNS) s = s.replace(re, "[REDACTED]");
  return s;
}

const files = [...walk("src"), ...walk("scripts"), ...walk("supabase"), "package.json"]
  .filter((f) => !f.endsWith("review-pack.mjs"))
  .sort();

let out = "# CODE REVIEW PACK\n\n";
out += "Is file mein project ka poora code hai (secrets redacted). Neeche ke DO kaam alag alag karo.\n\n";
out += "## PROMPT A: Line by line samjhao\n";
out += "Tum ek senior developer ho. Neeche diye code ko file by file, line by line Roman Urdu/Hinglish mein aasan zabaan mein samjhao. ";
out += "Har file ke end par likho: ye file kya karti hai, kaun si files par depend karti hai, aur kaunsi cheez mere liye samajhna sabse zaroori hai. ";
out += "Jo cheez tumhe pakki nahi pata, wahan saaf likho 'pakka nahi'.\n\n";
out += "## PROMPT B: Security aur bug review\n";
out += "Tum ek strict security reviewer ho. Ye code kisi aur AI ne likha hai, isliye is par bharosa mat karo. Dhoondho aur severity (High/Medium/Low) ke saath batao:\n";
out += "1. Hardcoded keys ya secrets\n2. Supabase RLS aur service_role ka galat istemal\n3. Input validation ki kamiyan\n4. Authentication/authorization (kaun kaun si API bina login ke khuli hai, kaunsa personal data leak ho sakta hai)\n";
out += "5. Rate limiting aur abuse (LLM quota ya DB spam)\n6. Chatbot prompt injection\n7. Error handling aur logs mein sensitive data\n8. Fake ya risky packages\n9. Production se pehle ki top 5 fixes\n";
out += "Har issue ke saath exact file aur line, aur fix ka chhota code do.\n\n---\n\n## CODE\n\n";

for (const f of files) {
  const ext = f.slice(f.lastIndexOf(".") + 1);
  out += "### " + f + "\n```" + ext + "\n" + redact(readFileSync(f, "utf8")) + "\n```\n\n";
}
writeFileSync("REVIEW_PACK.md", out);
console.log(`✅ REVIEW_PACK.md ban gaya (${files.length} files, ${Math.round(out.length / 1024)} KB)`);
console.log("   Ab: REVIEW_PACK.md kholo, Prompt A aur Prompt B alag alag doosre AI mein code ke saath paste karo.");
console.log("   .env.local kabhi kisi AI ko mat do.");
