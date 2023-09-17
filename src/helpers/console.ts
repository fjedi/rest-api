/* eslint-disable import/prefer-default-export, no-console */
// IP library, for determining the local network interface
import ip from 'ip';
import { getServerURL } from './env';

// ----------------------
export type ServerStartLogger = {
  host?: string;
  port?: number | string;
  allowSSL?: boolean;
  type: string;
};

export async function logServerStarted(opt: ServerStartLogger): Promise<void> {
  // Display a border around a message
  const { default: boxen } = await import('boxen');
  // Chalk library, to add colour to our console logs
  const { default: chalk } = await import('chalk');

  const { type, host, port, allowSSL } = opt;
  let message = chalk.green(
    `Running ${chalk.bold(type)} in ${chalk.bold(process.env.NODE_ENV)} mode\n\n`,
  );
  message += `- ${chalk.bold('Local:           ')} ${getServerURL(host, `${port}`, allowSSL)}`;

  try {
    const url = getServerURL(ip.address(), `${port}`, allowSSL);
    message += `\n- ${chalk.bold('On Your Network: ')} ${url}`;
  } catch (err) {
    /* ignore errors */
  }

  console.log(
    boxen(message, {
      padding: 1,
      borderColor: 'green',
      margin: 1,
    }),
  );
}
