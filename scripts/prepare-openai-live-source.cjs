// Build a candidate from the downloaded production source, never from main.
const fs = require('node:fs');
const path = require('node:path');
function prepare(source) {
  const a = source.indexOf('exports.contactForm =');
  const b = source.indexOf('// ─── CLIENT PORTAL', a);
  if (a < 0 || b < 0) throw Error('Unknown contact handler boundaries');
  const nl = source.includes('\r\n') ? '\r\n' : '\n';
  let handler = source.slice(a, b);
  function replace(before, after) {
    if (handler.split(before).length !== 2) throw Error('Production source drift: patch refused');
    handler = handler.replace(before, after.split('\n').join(nl));
  }
  replace('  if (website) {', '  const wantsJson = /application\\/json/i.test(req.headers.accept || "");\n  res.set("Cache-Control", "no-store");\n\n  if (website) {');
  replace('    res.redirect(merciUrl);' + nl + '    return;', '    if (wantsJson) { res.status(200).json({ accepted: false }); return; }\n    res.redirect(merciUrl);\n    return;');
  replace('    if (adminEmail.error) {', '    if (!adminEmail || adminEmail.error || !adminEmail.data || typeof adminEmail.data.id !== "string" || !adminEmail.data.id) {');
  replace('      console.error("Resend Admin Error:", adminEmail.error);', '      console.error("Resend notification not explicitly accepted");');
  replace('    if (guardReservation) {', '    const acceptedEventId = guardReservation ? guardReservation.eventId : require("node:crypto").randomUUID();\n    const acceptedAtMs = Date.now();\n\n    if (guardReservation) {');
  replace('    // 2. Send User Confirmation (to the sender)', '    // Advertising must never change the accepted commercial outcome.\n    try {\n      const { sendAcceptedLead } = require("./openai-conversions");\n      const measurement = await sendAcceptedLead({ id: acceptedEventId, timestampMs: acceptedAtMs, body: req.body || {}, lang });\n      console.log("OpenAI conversion transport", measurement.state, measurement.status || "");\n    } catch (_) { console.error("OpenAI measurement unavailable"); }\n\n    // 2. Send User Confirmation (to the sender)');
  replace('    res.redirect(merciUrl);' + nl + '  } catch (err) {', '    if (wantsJson) {\n      res.status(200).json({\n        accepted: true,\n        event_id: acceptedEventId,\n        redirect_url: merciUrl\n      });\n      return;\n    }\n    res.redirect(merciUrl);\n  } catch (err) {');
  const result = source.slice(0, a) + handler + source.slice(b);
  if (result.slice(0, a) !== source.slice(0, a) || result.slice(result.indexOf('// ─── CLIENT PORTAL', a)) !== source.slice(b)) throw Error('Unrelated source changed');
  return result;
}
module.exports = { prepare };
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || fs.existsSync(output)) throw Error('Input file and new output directory required');
  const source = prepare(fs.readFileSync(input, 'utf8'));
  fs.mkdirSync(output, { recursive: true });
  for (const file of fs.readdirSync(path.dirname(input))) {
    const original = path.join(path.dirname(input), file);
    if (fs.statSync(original).isFile()) fs.copyFileSync(original, path.join(output, file));
  }
  fs.writeFileSync(path.join(output, 'index.js'), source);
  fs.copyFileSync(path.join(__dirname, '../functions/openai-conversions.js'), path.join(output, 'openai-conversions.js'));
  console.log('Production-based candidate prepared. No deployment; only contact handler changed.');
}
