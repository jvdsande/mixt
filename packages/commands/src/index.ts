import InitCommand from 'management/init'
import AddCommand from 'management/add'
import ListCommand from 'management/list'
import HoistCommand from 'management/hoist'
import StubCommand from 'management/stub'

import StatusCommand from 'release/status'
import ReleaseCommand from 'release/release'
import BundleCommand from 'release/bundle'
import TagCommand from 'release/tag'
import UntagCommand from 'release/untag'

import RunCommand from 'script/run'
import ExecCommand from 'script/exec'
import ShCommand from 'script/sh'

import BuildCommand from 'shorthands/build'
import WatchCommand from 'shorthands/watch'
import TestCommand from 'shorthands/test'
import StartCommand from 'shorthands/start'
import InstallCommand from 'shorthands/install'
import CICommand from 'shorthands/ci'

export const ManagementCommands = [InitCommand, AddCommand, ListCommand, HoistCommand, StubCommand]
export const ReleaseCommands = [StatusCommand, ReleaseCommand, BundleCommand, TagCommand, UntagCommand]
export const ScriptCommands = [RunCommand, ExecCommand, ShCommand]
export const ShorthandsCommands = [BuildCommand, WatchCommand, StartCommand, TestCommand, InstallCommand, CICommand]
