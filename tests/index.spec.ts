import { describe, test } from 'node:test'
import * as novelai from '../src'
import { Context } from 'koishi'
import mock from '@koishijs/plugin-mock'

describe('koishi-plugin-novelai', () => {
  test('parse input', () => {
    const ctx = new Context()
    ctx.plugin(mock)
    const session = ctx.bots[0].session({})
    const fork = ctx.plugin(novelai)
    console.log(novelai.parseInput(session, '<lora:skr2:1>,1girl', fork.config, false))
  })
})
