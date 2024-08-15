import { Session } from "koishi"
import { Config, DanTagGenConfig } from "./config"

type WebUiExtensionArgs = Array<boolean | number | string | object | null>

interface ExtensionGenRes {
    name: string,
    args: WebUiExtensionArgs
}

interface WebUiExtensionParams {
    [key: string]: { args: WebUiExtensionArgs }
}

function danTagGen(session: Session, config: Config): ExtensionGenRes | false {
    if (!config.danTagGen || !config.danTagGen.enabled) return false

    const danTagGenConfig = config.danTagGen as DanTagGenConfig
    return {
        name: 'DanTagGen',
        args: [
            true,  // enable
            danTagGenConfig.upsamplingTiming === 'After'
                ? 'After applying other prompt processings'
                : 'Before applying other prompt processings',
            danTagGenConfig.upsamplingTagsSeed,
            danTagGenConfig.totalTagLength,
            danTagGenConfig.banTags,
            danTagGenConfig.promptFormat,
            danTagGenConfig.temperature,
            danTagGenConfig.topP,
            danTagGenConfig.topK,
            danTagGenConfig.model,
            danTagGenConfig.useCpu,
            danTagGenConfig.noFormatting,
        ]
    }
}

const webUiExtensions: Array<(session: Session, config: Config) => ExtensionGenRes | false> = [danTagGen]

export function genExtensionsArgs(session: Session, config: Config): WebUiExtensionParams {
    if (!config.danTagGen) return {}
    const args: WebUiExtensionParams = {}
    for (const extension of webUiExtensions) {
        const _args = extension(session, config)
        if (_args) {
            args[_args.name] = { args: _args.args }
        }
    }
    return args
}

