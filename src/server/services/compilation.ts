import { execFile } from "child_process";
import { writeFile, readFile, rm, mkdtemp } from "fs/promises";
import path from "path";
import os from "os";

export class CompilationService {
  async compile(source: string, yamlContent?: string): Promise<Buffer> {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "typst-"));
    const inputPath = path.join(tmpDir, "template.typ");
    const outputPath = path.join(tmpDir, "output.pdf");

    try {
      await writeFile(inputPath, source, "utf-8");

      if (yamlContent !== undefined) {
        await writeFile(path.join(tmpDir, "content.yml"), yamlContent, "utf-8");
      }

      await new Promise<void>((resolve, reject) => {
        execFile(
          "typst",
          ["compile", inputPath, outputPath],
          { timeout: 15000 },
          (error, _stdout, stderr) => {
            if (error) {
              reject(
                new Error(
                  `Typst compilation failed: ${stderr || error.message}`,
                ),
              );
            } else {
              resolve();
            }
          },
        );
      });

      return await readFile(outputPath);
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {
        // ignore cleanup errors
      });
    }
  }
}
