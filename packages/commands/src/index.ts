import InitCommand from 'management/init'
import AddCommand from 'management/add'
import ListCommand from 'management/list'
import HoistCommand from 'management/hoist'
import StubCommand from 'management/stub'

import StatusCommand from 'release/status'
import ReleaseCommand from 'release/release'
import BundleCommand from 'release/bundle'

import RunCommand from 'script/run'
import ExecCommand from 'script/exec'

import BuildCommand from 'shorthands/build'
import WatchCommand from 'shorthands/watch'
import TestCommand from 'shorthands/test'
import StartCommand from 'shorthands/start'

export const ManagementCommands = [InitCommand, AddCommand, ListCommand, HoistCommand, StubCommand]
export const ReleaseCommands = [StatusCommand, ReleaseCommand, BundleCommand]
export const ScriptCommands = [RunCommand, ExecCommand]
export const ShorthandsCommands = [BuildCommand, WatchCommand, StartCommand, TestCommand]
