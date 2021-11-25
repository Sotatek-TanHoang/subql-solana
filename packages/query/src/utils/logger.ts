// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {LoggerService} from '@nestjs/common';
import {Logger} from '@subql/common';
import Pino from 'pino';
import {argv} from '../yargs';

const outputFmt = argv('output-fmt') as 'json' | 'colored';
const logLevel = argv('log-level') as string | undefined;
const logToFile = argv('log-to-file') as boolean | undefined;

let logger: Logger;

if (logToFile) {
  logger = new Logger({level: logLevel, outputFormat: outputFmt, logToFile});
} else {
  logger = new Logger({level: logLevel, outputFormat: outputFmt});
}

export function getLogger(category: string): Pino.Logger {
  return logger.getLogger(category);
}

export class NestLogger implements LoggerService {
  private logger = logger.getLogger('nestjs');

  error(message: any, trace?: string) {
    if (trace) {
      this.logger.error({trace}, message);
    } else {
      this.logger.error(message);
    }
  }

  log(message: any): any {
    this.logger.info(message);
  }

  warn(message: any): any {
    this.logger.warn(message);
  }
}
