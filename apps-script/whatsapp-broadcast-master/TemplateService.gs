/**
 * Approved WhatsApp template loading, caching, and preview.
 */

var TemplateService = (function () {
  function refresh() {
    var result = SheetomaticApi.getTemplates();
    if (!result.ok) {
      AppLogger.error('Refresh templates', { error: result.error, apiEndpoint: DOCUMENTED_ENDPOINTS.TEMPLATES_FOR_SEND });
      return result;
    }

    var rows = result.templates.map(function (template) {
      return {
        Name: template.name,
        Language: template.language,
        Category: template.category || '',
        Status: template.status,
        Variables: (template.variables || []).map(function (name) {
          return '{{' + name + '}}';
        }).join(', '),
        'Header Format': template.headerFormat || '',
        Body: template.body || '',
        Usable: template.usable ? 'YES' : 'NO',
        'Refreshed At': nowPretty_()
      };
    });

    SheetService.clearData(SHEET_NAMES.TEMPLATES);
    if (rows.length) {
      SheetService.writeObjects(SHEET_NAMES.TEMPLATES, TEMPLATE_HEADERS, rows);
    }
    AppLogger.info('Refresh templates', {
      status: 'OK',
      response: rows.length + ' templates'
    });
    return { ok: true, templates: result.templates };
  }

  function listCached() {
    var rows = SheetService.readObjects(SHEET_NAMES.TEMPLATES);
    if (!rows.length) {
      var live = refresh();
      return live.ok ? live.templates : [];
    }
    return rows.map(function (row) {
      return {
        name: row.Name,
        language: row.Language,
        category: row.Category,
        status: row.Status,
        variables: String(row.Variables || '')
          .split(',')
          .map(function (item) {
            return item.replace(/\{\{|\}\}/g, '').trim();
          })
          .filter(Boolean),
        headerFormat: row['Header Format'] || 'TEXT',
        body: row.Body || '',
        usable: String(row.Usable).toUpperCase() === 'YES'
      };
    });
  }

  function detail(name, language) {
    var result = SheetomaticApi.getTemplateDetail(name, language);
    if (!result.ok) return result;
    return result;
  }

  function buildComponents(template, mapping, row, media) {
    var components = [];
    var variables = (template && template.variables) || [];
    if (variables.length) {
      components.push({
        type: 'body',
        parameters: variables.map(function (name) {
          var column = mapping && mapping[name];
          var value = column && row ? row[column] : '';
          return { type: 'text', text: sliceParam_(value) };
        })
      });
    }
    if (media) {
      components.unshift(SheetomaticApi.buildHeaderComponent(media));
    }
    return components;
  }

  function preview(template, mapping, row) {
    var text = String((template && template.body) || '');
    var variables = (template && template.variables) || [];
    variables.forEach(function (name) {
      var column = mapping && mapping[name];
      var value = column && row ? row[column] : '[' + name + ']';
      var pattern = new RegExp('\\{\\{\\s*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\}\\}', 'g');
      text = text.replace(pattern, sliceParam_(value));
    });
    return text.trim();
  }

  function sliceParam_(value) {
    var text = value === null || value === undefined ? '' : String(value).trim();
    if (!text) return '-';
    return text.slice(0, 900);
  }

  function usableOnly(templates) {
    return (templates || []).filter(function (item) {
      return item.usable || SheetomaticApi.isUsableStatus(item.status);
    });
  }

  return {
    refresh: refresh,
    listCached: listCached,
    detail: detail,
    buildComponents: buildComponents,
    preview: preview,
    usableOnly: usableOnly
  };
})();
