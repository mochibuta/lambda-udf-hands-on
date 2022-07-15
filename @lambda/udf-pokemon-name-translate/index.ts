import { getName } from 'pokemon'

type response = {
  success: boolean
  results?: string[]
  num_records?: number
  error_msg?: string
}

type event = {
  request_id: string
  cluster: string
  user: string
  database: string
  external_function: string
  query_id: number
  num_records: number
  arguments: [[string]]
}

exports.handler = async (event: event): Promise<string> => {
  const results = []

  try {
    for (const arg of event['arguments']) {
      const id = Number(arg[0])

      results.push(
        JSON.stringify({
          de: getName(id, 'de'),
          fr: getName(id, 'fr'),
          ru: getName(id, 'ru'),
          zhs: getName(id, 'zh-Hans'),
        }),
      )
    }

    const response: response = {
      success: true,
      results: results,
      num_records: results.length,
    }

    return JSON.stringify(response)
  } catch (e) {
    console.error(e)
    const response: response = {
      success: false,
      error_msg: 'error',
    }

    return JSON.stringify(response)
  }
}
