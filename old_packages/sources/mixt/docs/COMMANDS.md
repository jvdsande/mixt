# CLI Commands

Here is a complete list of the commands availble through the **Mixt** command line tool.

To install the CLI tool, please run

```
npm install -g mixt
```

## Commands

### `mixt --help`
Prints a standard help output about the tool, listing the various options.

### `mixt [command] --help`
Prints the help page for a specific command.

### `mixt init` :

##### Description
Initializes a repository following **Mixt**'s structure. It calls `npm init` internally
for you.

##### Available options
`-r, --root [root]` : Specify a working directory in which to initialize the **Mixt** structure. Defaults to current working directory.

`-p, --packages [packages]` : Specify a custom name for the `packages` folder. It will be saved in the project's configuration.

`-s, --sources [sources]` : Comma-separated list of names for the folder hosting the sources. It will be saved in the project's configuration.

`-c, --config [config]` : Tells the `init` command how to save the config. Correct values are : 
* `true` (default) : save the config in a `mixt.json` file
* `embed` : embed the config in a `mixt` field in the project's `package.json` file
* `false` : do not save any config


### `mixt add <package>` :

##### Description
Adds a new package to your sources. There again, it calls `npm init` from within
the new package's root directory.

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the packages.

`--source [source]` : Specify the source folder in which to add the package. Optionally, you can specify the source folder
directly in the package name as follows: `mixt add {source}/{package}   // equivalent to mixt add {package} --source {source}`

### `mixt build` :

##### Description
Builds all the packages from your `packages/sources` directory into the `packages/node_modules` directory.
If your package have a `build` script, it is executed first.
By default, `mixt build` tries to run the `build` script of your package, then copies the package into `node_modules`.

If your build process creates a separate folder containing a prebuilt package, you can add a `mixt` script
to your package, which will be executed after the `build` in place of the copy.


If you are using [@pika/pack](https://www.pikapkg.com/blog/introducing-pika-pack/), **Mixt** will handle it for
you out of the box by calling `pack build` with all the correct options. Don't forget to install `@pika/pack` as a 
dependency of your mono-repo!

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages to build.

`-q, --quiet-build` : Add this flag to completely disable logging from the build scripts. Logging from **Mixt** will still be printed.

`-R, --no-resolve` : Add this flag to skip the resolve step after building.

`--cheap` : Use this flag to enable the [cheap dependency resolving](https://github.com/boennemann/alle#cheap-alternative-to-finddefine-dependencies)

### `mixt watch` :

##### Description
This variant of `mixt build` builds your packages, and watches the filesystem for any change in your sources
to automatically rebuild the changed package. Use this in development to be able to test all your packages.

If your package has a `watch` script, **Mixt** calls it and defer the filesystem watching to it.

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages to watch.

`-q, --quiet-build` : Add this flag to completely disable logging from the build scripts. Logging from **Mixt** will still be printed.


### `mixt clean` :

##### Description
Cleans the `packages/node_modules` folder completely.

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages. The `node_modules` folder of this
folder will be emptied.


### `mixt resolve` :

##### Description
This step, automatically called after `mixt build`, resolves for you all the dependencies of your packages
and updates the produced `package.json` accordingly. See [Dependency Handling](#dependency-handling) for more details about
the dependency system used by **Mixt**.

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages to resolve.

`--cheap` : Use this flag to enable the [cheap dependency resolving](https://github.com/boennemann/alle#cheap-alternative-to-finddefine-dependencies)


### `mixt status` :

##### Description

List the packages that have changed since the last release. If you are using Git, a diff is made
against the latest tag. If not, then all packages are automatically marked as changed.

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages to check.


### `mixt publish` : 

##### Description
The publish script handles the publishing process of your packages.
For each changed package (see `status` above), **Mixt** asks you for an increment of version (or a custom one), updates the source
`package.json`, runs your build script and publishes the updated packages using `npm publish`.

If your folder hosts a Git repository, tags are automatically created for each package with the newly used version.
 
##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-p, --packages [packages]` : Specify the name of the folder holding the built packages.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages.

`-q, --quiet-build` : Add this flag to completely disable logging from the build scripts. Logging from **Mixt** will still be printed.

`-B, --no-build` : Add this flag to skip the build step before publishing. This is **strongly discouraged**.

`-R, --no-resolve` : Add this flag to skip the resolve step before publishing. This is **strongly discouraged**.

`--cheap` : Use this flag to enable the [cheap dependency resolving](https://github.com/boennemann/alle#cheap-alternative-to-finddefine-dependencies)

`-T, --no-tag` : Add this flag to skip creating git tags after publishing.

`--branch [branch]` : Specify a branch from which it is allowed to publish. Defaults to `master`

`--prefix [prefix]` : Specify a prefix to append to generated tags.


 
### `mixt run <script>` : 

##### Description
Check your source packages for a NPM script called `<script>`, and run it for each package where
it is found. 

##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages.





### `mixt exec <command>` : 

##### Description
Run the given shell command in all your source packages.
 
##### Available options
`-r, --root [root]` : Specify the directory where to run the command. Defaults to current working directory.

`-s, --sources [sources]` : Comma-separated list of source folder holding packages.


 
### Package-specific variants
For the following commands: `build`, `watch`, `resolve`, `publish`, `run` and `exec`, a package-specific variant
exists. To use it, simply add the name of the package(s) you want to run the command on
after the command.

For instance, to build only the module called `my-module`, you can do:

```
mixt build my-module
```

To run a NPM script on `module1` and `module2` specifically, run:

```
mixt run my-script module1 module2
```
