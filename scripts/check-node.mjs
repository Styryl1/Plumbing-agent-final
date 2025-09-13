const requiredMajor = 22;
const major = Number(process.versions.node.split(".")[0]);

if (Number.isNaN(major) || major < requiredMajor) {
  console.error(
    `✖ Node ${requiredMajor}.x required. Detected ${process.version}. ` +
      `Please switch Node (nvm use 22 / asdf / volta) and rerun.`,
  );
  process.exit(1);
}

