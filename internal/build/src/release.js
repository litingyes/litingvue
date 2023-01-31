const fs = require('fs')
const path = require('path')
const args = require('minimist')(process.argv.slice(2))
const semver = require('semver')
const { prompt } = require('enquirer')
const execa = require('execa')
const consola = require('consola')
const currentVersion = require('../../../package.json').version

const preId = args.preid || (semver.prerelease(currentVersion) && semver.prerelease(currentVersion)[0])
const isDryRun = args.dry
const skipTests = args.skipTests
const skipBuild = args.skipBuild
const packages = fs.readdirSync(path.resolve(__dirname, '../packages')).filter(p => !p.endsWith('.ts') && !p.startsWith('.'))

const skippedPackages = []

const versionIncrements = ['patch', 'minor', 'major', ...(preId ? ['prepatch', 'preminor', 'premajor', 'prerelease'] : [])]

const inc = i => semver.inc(currentVersion, i, preId)
const bin = name => path.resolve(__dirname, `../node_modules/.bin/${name}`)
const run = (bin, args, opts = {}) => execa(bin, args, { stdio: 'inherit', ...opts })
const dryRun = (bin, args, opts = {}) => consola.info(`[dryrun] ${bin} ${args.join(' ')}`, opts)
const runIfNotDry = isDryRun ? dryRun : run
const getPkgRoot = pkg => path.resolve(__dirname, `../packages/${pkg}`)
const step = msg => consola.info(msg)

async function main() {
  let targetVersion = args._[0]

  if (!targetVersion) {
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: versionIncrements.map(i => `${i} (${inc(i)})`).concat(['custom']),
    })

    if (release === 'custom') {
      targetVersion = (
        await prompt({
          type: 'input',
          name: 'version',
          message: 'Input custom version',
          initial: currentVersion,
        })
      ).version
    }
    else {
      targetVersion = release.match(/\((.*)\)/)[1]
    }
  }

  if (!semver.valid(targetVersion))
    throw new Error(`invalid target version: ${targetVersion}`)

  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing v${targetVersion}. Confirm?`,
  })

  if (!yes)
    return

  step('\nUpdating cross dependencies...')
  updateVersions(targetVersion)

  //   // build all packages with types
  // step('\nBuilding all packages...')
  // if (!skipBuild && !isDryRun) {
  //   await run('pnpm', ['run', 'build', '--release'])
  //   // test generated dts files
  //   step('\nVerifying type declarations...')
  //   await run('pnpm', ['run', 'test-dts-only'])
  // } else {
  //   console.log(`(skipped)`)
  // }

  step('\nGenerating changelog...')
  await run('pnpm', ['run', 'changelog'])

  step('\nUpdating lockfile...')
  await run('pnpm', ['install', '--prefer-offline'])

  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
  if (stdout) {
    step('\nCommitting changes...')
    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `chore: release v${targetVersion}`])
  }
  else {
    consola.warn('No changes to commit.')
  }

  step('\nPublishing packages...')
  for (const pkg of packages) await publishPackage(pkg, targetVersion, runIfNotDry)

  step('\nPushing to GitHub...')
  await runIfNotDry('git', ['tag', `v${targetVersion}`])
  await runIfNotDry('git', ['push', 'origin', `refs/tags/v${targetVersion}`])
  await runIfNotDry('git', ['push'])

  if (isDryRun)
    consola.success('\nDry run finished - run git diff to see package changes.')

  if (skippedPackages.length)
    consola.warn(`The following packages are skipped and NOT published:\n- ${skippedPackages.join('\n- ')}`)

  consola.log()
}

function updateVersions(version) {
  updatePackage(path.resolve(__dirname, '..'), version)
  packages.forEach(p => updatePackage(getPkgRoot(p), version))
}

function updatePackage(pkgRoot, version) {
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  pkg.version = version
  updateDeps(pkg, 'dependencies', version)
  updateDeps(pkg, 'peerDependencies', version)
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

function updateDeps(pkg, depType, version) {
  const deps = pkg[depType]
  if (!deps)
    return
  Object.keys(deps).forEach((dep) => {
    if (dep === 'litingvue' || (dep.startsWith('@litingvue') && packages.includes(dep.replace(/^@litingvue\//, '')))) {
      consola.success(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      deps[dep] = version
    }
  })
}

async function publishPackage(pkgName, version, runIfNotDry) {
  if (skippedPackages.includes(pkgName))
    return

  const pkgRoot = getPkgRoot(pkgName)
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  if (pkg.private)
    return

  let releaseTag = null
  if (args.tag)
    releaseTag = args.tag
  else if (version.includes('alpha'))
    releaseTag = 'alpha'
  else if (version.includes('beta'))
    releaseTag = 'beta'
  else if (version.includes('rc'))
    releaseTag = 'rc'

  step(`Publishing ${pkgName}...`)
  try {
    await runIfNotDry(
      'yarn',
      ['publish', '--new-version', version, ...(releaseTag ? ['--tag', releaseTag] : []), '--access', 'public'],
      {
        cwd: pkgRoot,
        stdio: 'pipe',
      },
    )
    consola.success(`Successfully published ${pkgName}@${version}`)
  }
  catch (e) {
    if (e.stderr.match(/previously published/))
      consola.error(`Skipping already published: ${pkgName}`)
    else throw e
  }
}

main().catch((err) => {
  updateVersions(currentVersion)
  consola.error(err)
})
