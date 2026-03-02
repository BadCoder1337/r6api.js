import { AuthManager } from '../auth';
import { getURL } from '../utils';

export default async (auth: AuthManager, username: string) => {

  const { userId } = await auth.getAuth();

  interface IApiResponse {
    validationReports: {
      ErrorCode: number;
      Field: string;
      FieldValueSuggestion: string | null;
      Message: string;
    }[];
  }

  interface IReport {
    Category?: string[];
    Severity?: string;
    Locale?: string;
  }

  return auth.getToken()
    .then(auth.fetch<IApiResponse>(
      getURL.VALIDATEUSERNAME(userId),
      {
        method: 'POST',
        body: JSON.stringify({ nameOnPlatform: username })
      }
    ))
    .then(res =>
      res.validationReports.length > 0
        ? {
          valid: false,
          validationReports: res.validationReports.map(report => {
            const [match] = report.Message.match(/(?<=\[).*(?=\])/) || [null];
            const reportFormatted = match
              ? match
                .split(', ')
                .map(x => x.split(':').flatMap(y => y.trim().split(',')))
                .reduce((acc, cur) => {
                  acc[cur[0] as string] = cur[0] === 'Category' ? cur.slice(1) : cur[1];
                  return acc;
                }, {} as Record<string, any>) as IReport
              : null;
            return {
              message: report.Message.replace(/\[.*\]/g, '').trim(),
              categories: reportFormatted && reportFormatted.Category || null,
              severity: reportFormatted && reportFormatted.Severity || null,
              locale: reportFormatted && reportFormatted.Locale || null,
              errorCode: report.ErrorCode,
              suggestions: typeof report.FieldValueSuggestion === 'string'
                ? report.FieldValueSuggestion.split(',') : report.FieldValueSuggestion
            };
          })
        }
        : { valid: true }
    );

};
