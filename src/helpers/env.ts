import { execSync, spawnSync } from "child_process";
import { logger } from "../database";
import { CondaEnvironment } from "./types/conda";

export async function installDependencies() {
  logger.info("Checking environment for required dependencies");
  let conda = spawnSync("conda", ["--version"], {
    stdio: "inherit",
  });
  if (conda.error) {
    logger.error(conda.error);
    logger.error("Cannot find required dependency 'conda'");
    logger.error(
      "Please install the above dependency before running this tool again"
    );
    process.exit(1);
  } else {
    logger.info("Checking list of environments for previous installations");
    let validEnvironments = getCondaEnvironments().filter(
      (e) => e.isImpkitEnvironment
    );

    if (validEnvironments.length === 0) {
      logger.warn("Didnt find any valid environments");
      logger.info("Creating fresh environment");
      createCondaEnvironment();
    } else if (validEnvironments.filter((e) => e.active).length === 0) {
      logger.warn(`Found valid environment '${validEnvironments[0].name}'`);
      logger.warn(
        "\x1b[33mYOU NEED TO MANUALLY ACTIVATE THE ENVIRONMENT TO RUN THIS NEXT STEP\x1b[0m"
      );
      process.exit(0);
    }

    logger.info("sanity checking environment lists...");
    validEnvironments = getCondaEnvironments().filter(
      (e) => e.isImpkitEnvironment
    );

    if (validEnvironments.filter((e) => e.active).length === 1) {
      logger.info("Sanity check: Sane");
      logger.info("Environment initialised");
      logger.info("Starting main application");
      return;
    }

    //     let whisperx = spawnSync("whisperx", ['-h']);
    //     if(whisperx.error) {
    //         logger.warn('WhisperX not found')
    //         logger.info('Installing from scratch');
    //         logger.info('> Checking for Conda environment')
    //     }
    process.exit();
  }
}

function getCondaEnvironments(): CondaEnvironment[] {
  logger.debug("Extracting conda env info");
  let condaResponse = execSync("conda info --envs");
  let environments: CondaEnvironment[] = [];

  let lines = condaResponse.toString().split("\n");
  for (const line of lines) {
    if (line[0] === "#" || line.length === 0) continue;
    environments.push(CondaEnvironment.fromCMD(line));
  }

  return environments;
}

function createCondaEnvironment() {
  let environment = `ik_${Date.now()}`;
  logger.debug(`Creating new environment with name '${environment}'`);
  let create = spawnSync(
    `conda`,
    ["create", "--name", environment, "python=3.10"],
    {
      stdio: "inherit",
    }
  );
  if (create.error) {
    logger.error("Encountered an error creating a new environment");
    logger.error(create.error);
    process.exit(1);
  }

  logger.debug("Attempting to activate environment");
  let activate = spawnSync("conda", ["activate", environment], {
    stdio: "inherit",
  });

  if (activate.error) {
    logger.error("Encountered an error activating a new environment");
    logger.error(activate.error);
    process.exit(1);
  }

  logger.debug("Attempting to install required dependencies");
  let installDependencies = spawnSync(
    "conda",
    [
      "install",
      "-y",
      "pytorch==2.0.0",
      "torchaudio==2.0.0",
      "pytorch-cuda=11.8",
      "-c",
      "pytorch",
      "-c",
      "nvidia",
    ],
    {
      stdio: "inherit",
    }
  );

  if (installDependencies.error) {
    logger.error(
      "Encountered an error initializing dependencies in new environment"
    );
    logger.error(installDependencies.error);
    process.exit(1);
  }

  logger.debug("Attempting to install WhisperX");
  let installWhisper = spawnSync(
    "pip",
    ["install", "git+https://github.com/m-bain/whisperx.git"],
    {
      stdio: "inherit",
    }
  );

  if (installWhisper.error) {
    logger.error(
      "Encountered an error initializing WhisperX in new environment"
    );
    logger.error(installWhisper.error);
    process.exit(1);
  }
  logger.info("Done!");
}

// function activateCondaEnvironment(env: CondaEnvironment) {
//   logger.debug("Attempting to initialise environment");
//   let init = spawnSync("conda", ["init"], {
//     stdio: "inherit",
//   });

//   if (init.error) {
//     logger.error("Encountered an error initialising the environment");
//     logger.error(init.error);
//     process.exit(1);
//   }

//   logger.debug("Attempting to activate environment");
//   let activate = spawnSync("conda", ["activate", env.name], {
//     stdio: "inherit",
//   });

//   if (activate.error) {
//     logger.error("Encountered an error activating a the environment");
//     logger.error(activate.error);
//     process.exit(1);
//   }
// }
