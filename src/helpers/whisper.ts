import { exec, execSync, spawn, spawnSync } from "child_process";

export function transcribeAudio(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("> Starting Transcription Process");
    let child = spawn("whisperx", [
      `./audio/${id}.mp3`,
      "--device",
      "cuda",
      "--compute_type",
      "float16",
      "--output_format",
      "all",
      "--output_dir",
      "transcribed",
      "--model",
      "medium",
      "--diarize",
      "--highlight_words",
      "True",
      "--hf_token",
      process.env["HF_TOKEN"] || "",
      "--language",
      "en",
      "--print_progress",
      "True",
      "--threads",
      "12"
    ], {
        stdio: 'inherit'
    });

    // child.stdout.on("data", process.stdoudit.write);
    // child.stderr.on("data", process.stderr.write);
    // process.stdin.on("data", child.stdin.write);

    child.on("exit", resolve);
    child.on("error", reject);
  });
}
