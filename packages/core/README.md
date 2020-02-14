# Mixt - Mono-repo manager

A simple packager for handling your mono-repo of Node packages.

**Mixt** allows you to handle your mono-repo with close to no boilerplate, 
and without worrying about extra steps.

Run any build or watch pipeline in your sub-packages, and gracefully handle the release process.

## Project structure

A **Mixt** project follows a very simple project structure. At the root,
it looks like any other NPM package, with a `package.json` file and a `node_modules` folder.

We then add a `packages` folder which will be holding our actual packages.

While using **Mixt**, you only ever have to worry about what's inside the 
`packages` folder: that's all you. For the rest, let us take care of it.


Your project structure should look like this:

```
mixt-project/
    node_modules/
    packages/       <-- Your packages go here
    package.json
```


## Command Line Tool

**Mixt** offers a CLI utility that takes care of most common tasks about package
handling: initializing the mono-repo, creating a new package, building, publishing...
Everything is exposed through the `mixt` command.

You can install the command by running:

```
npm install -g @mixt/core
```

From there, you obtain access to the following commands. 
For a more thorough explanations of all commands, refer to the [command help page](../commands/README.md)

*Note: if you had been using the previous **Mixt** version from the `mixt` package, make sure to run `npm rm -g mixt` before installing `@mixt/core`*

### Monorepo Management commands:

**Mixt** provides a set of CLI commands for managing your monorepo.

### `mixt init` :

Initializes a repository following **Mixt**'s structure. It calls `npm init` internally
for you.

### `mixt add [source] <package>` :

Adds a new package to your sources. There again, it calls `npm init` from within
the new package's root directory.

If the source parameter is omitted, the package will be added to the first source folder configured.

To learn more about source folders, refer to [Customizing the structure](#customize-structure)

### `mixt list` :

List all packages handled by **Mixt** and display basic information about them

### `mixt hoist [packages...]` :

Get all **Mixt**-managed packages and add them to the root's `package.json` as `file:` dependency

If you specify a list of packages names as variadic argument, only those packages will be hoisted.

### Cross-packages script handling commands:

**Mixt** makes it easy to run commands in one or multiple managed packages.

### `mixt run <script> [packages...]` :

Go through all managed packages (or packages given to the command), and execute the given NPM script if found.

All packages are checked sequentially, so only one script ever runs at a time.

### `mixt exec <command> [packages...]` :

Behaves just like `mixt run`, but takes a bash command to run in each packages instead of an NPM script name.

#### Shorthands commands:

### `mixt build [packages...]` :

Shorthand for `mixt run build`. Will also match `mixt:build` scripts.

### `mixt watch [packages...]` :

Shorthand for `mixt run watch`. Will also match `mixt:watch`, `mixt:dev` and `dev` scripts.

### `mixt test [packages...]` :

Shorthand for `mixt run test`. Will also match `mixt:test` scripts.

### Release related commands:

### `mixt status [packages...]` :

Check against the latest Git tag to see which packages have been modified since. If no tag is found, all packages are
marked as changed by default.

### `mixt release [packages...]` :

Helper command for gracefully handling your package releases. It provides a CLI workflow for bumping your packages versions,
optionally builds your packages before release, etc... Here is the complete **Mixt** release flow :
 - **Check repository:** only allow releases from the configured branch
 - **Get modified packages:** find packages in need of a new release
 - **Bump packages versions:** ask you for the next version of each packages
 - **Build packages (optional):** build all packages before releasing
 - **Resolve dependencies:** inject all root dependency to the local `package.json`, injecting the correct version for local packages
 - **Execute release script:** look for a `mixt:release` or `release` script in each package and execute it
 - **Commit releases (optional):** create a release commit with all released packages names and versions
 - **Create tags (optional):** create a Git tag for each released package
 - **Revert dependency resolve:** revert your local `package.json` to their original state (except version)
 - **Commit revert (optional):** commit again to store the revert of local dependency
 
That is quite a lot, but it is what is most often needed for any releases. Here all is taken care of for you in one simple command.


## Dependency Handling <a name="dependency-handling"></a>

The dependency system is based on the `file:` resolution from NPM.

All local packages are hoisted up to the root `package.json` as a `file:` entry, thus becoming available for all their sibling packages, thanks to
the require algorithm wich looks in parents' `node_modules` and `package.json`.

#### External dependency for a package
If one of your packages needs an external dependency, just go ahead and install it inside your package sources,
just like you would do in a normal setup.

#### External dependency shared by multiple packages
If your dependency is shared by multiple local packages (it does not need to be used by *all* of them, just a few), then
you should instead add it to the root's `package.json`. It will still be available from within your packages, again relying
on the require algorithm which looks in parents' `node_modules`.

This way, you can make sure that all of your packages always use the same version of your shared dependency.

#### Dependency to a local package
If one of your local packages needs to import another one, just go ahead and require it in your code. Don't forget to run `mixt hoist`
if your local packages do not all appear in the root `package.json`.


### The *resolve* step
While the above setup works great locally inside the mono-repo, it does not allow you to publish your
packages as-is: they will be missing dependency definitions in their `package.json` files, as some will be
instead in the root `package.json` file (common dependency).

The `mixt resolve` command makes sure that the built `package.json` is fully up-to-date by checking your code
for any package required, and then resolving it either from your `package.json` or the root `package.json`.

Dependencies specified in your module's `package.json` always take precedence over the root `package.json`.

Beware that only `file:` dependencies in the *root* `packages.json` will be resolved to your local packages. Dependencies
in your module's `package.json` will be left untouched.

If you want a dependency from the root `package.json` to be included in your local `package.json` even if the resolve step
cannot find it, just add it to the local `package.json` with a version of `"*"`, **Mixt** will automatically resolve it for you.

## Customizing the structure <a name="customize-structure"></a>

When using **Mixt**, you can choose to change the default source folder(s). For instance, you might want to use 
a `pkg` folder instead of `packages`. Or you might want to split your sources between multiple folders.

All of this is possible either by providing a configuration file, or by passing options to commands.


### Using options

For almost all commands, you can use the following option to modify the default behavior:

`--sources [sources]`: comma-separated list of source folders. Source folders must be relative paths to the root of your repository.

### Using a config file

If you want to avoid passing options to each of your commands, you can opt for a configuration file.
This configuration file should lie at the root of your **Mixt** project, and must be called `mixt.json`.

This is what the default configuration file would look like:

```json
{
  "sources": [
    "packages"
  ]
}
```

### Using `package.json`

If you'd rather not add another file to your project, you can configure **Mixt** directly
from your `package.json` file. Simply add a `"mixt"` entry that holds the same value you would
put in the `mixt.json` file.

### Option resolve

So what happens if you mix and match any or all of the three methods above? An order of priority is respected.

**Mixt** will start by looking for options directly passed to the command. If a value is not found, it will
then look into the `mixt.json` file. If not found, it will look for a `mixt` entry in your `package.json`. And finally,
if an option hasn't been found at the end of the process, the default value is used.

### Other options

Here is a fully configured **Mixt** instance, with all the default values:

```json
{
  "sources": ["packages"],
  "resolve": "full",
  "prefix": "mixt:",
  "git": {
    "branch": "master",
    "tagPrefix": ""
  }
}
```

#### `sources` :
List of source folders where managed packages are held.

#### `resolve` :
Resolve strategy to adopt. Can be configured on a per-module basis. Per-module configuration takes precedence over global configuration.

Can be one of:
* `"full"` : check inside source files to extract all used dependencies. Most robust, but can be long on big projects.
* `"cheap"` : only add dependencies referred to in the module's `package.json`. The wildcard `"*"` can be used as version to fetch the root's `package.json` dependency.
* `"all"` : add all dependencies from the root's `package.json`.
* `"none"` : keep the local `package.json` as-is

#### `prefix` :
Prefix to use for `build`, `watch` and `test` commands. Defaults to `mixt:`, so that `mixt:build` takes precedence over `build`, for instance.
This allows you to have a `build` script in your `package.json`, but hide it from **Mixt** by adding a `mixt:build` script to your scripts.

#### `git.branch` :
The branch from which the `mixt release` command is allowed

#### `git.tagPrefix` :
A prefix to append to all tags. 

By default, the format of tags will be `{pkgName}@{pkgVersion}`.

If a prefix is set, it will be `{prefix}-{pkgName}@{pkgVersion}`. The `-` is automatically added.

### Per-module settings

For each of your **Mixt**-managed module, you can add a `"mixt"` entry to your `package.json`. This entry have the following structure (all fields optional):

```json
{
  "mixt": {
    "dist": "./",
    "prefix": "mixt:",
    "resolve": "full"
  }
}
```

The first option, `"dist"`, specify the relative path for the distribution package, if it is different from the source package (such as a babel-built version, or @pika/pack module).

The last two are the same options as found in the global config. Local configuration takes precedence over global configuration.
