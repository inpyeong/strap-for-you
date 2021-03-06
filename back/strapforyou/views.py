from django.http import HttpResponse
from django.shortcuts import render

# Create your views here.
from django.contrib.auth.models import User, Group
from rest_framework import viewsets
from rest_framework import permissions
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer, GroupSerializer, FileSerializer

from datetime import datetime
import os
from os import path
import string
import pandas as pd
import unicodedata

from .models import File

BASE_DIR = os.getcwd()
MEDIA_ROOT = path.join(BASE_DIR, 'media')
FILES_ROOT = path.join(BASE_DIR, 'strapforyou', 'files')

class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]


class FileView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    queryset = File.objects.all()


    def post(self, request, *args, **kwargs):
        file_name, file_ext = path.splitext(request.data.dict()['remark'])
        file_ext = '.xlsx' if file_ext == '.xls' else file_ext
        normalized_remark = f'{self.normalize_nfc(file_name)}_{int(datetime.utcnow().timestamp())}{file_ext}'
        request.data.setlist('remark', [normalized_remark])

        file_serializer = FileSerializer(data=request.data)
        if file_serializer.is_valid():
            file_serializer.save()

            try:
                self.build_new_excel(normalized_remark)
                file = open(path.join(FILES_ROOT, normalized_remark), "rb")

                response = HttpResponse(file.read(),content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                response['Content-Disposition'] = f'attachment; filename={normalized_remark}'
                return response
            except Exception as e:
                return Response(file_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                # return Response(file_serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(file_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def normalize_nfc(self, text):
        return unicodedata.normalize('NFC', text)


    def build_new_excel(self, remark):

        origin_filename = self.normalize_nfc(File.objects.get(remark=remark).filename())
        file_name, file_ext = path.splitext(origin_filename)
        if file_ext == '.xls':
            file_ext = '.xlsx'
            # xls ??? xlsx ??? ??????
            os.rename(path.join(MEDIA_ROOT, origin_filename), path.join(MEDIA_ROOT, f'{file_name}{file_ext}'))
            origin_filename = f'{file_name}{file_ext}'

        new_filename = remark
        df = pd.read_excel(path.join(MEDIA_ROOT, origin_filename), engine='openpyxl')

        df.dropna(how='all', axis=0, inplace=True)  # ?????? ?????? ???????????? 'NaN'??? ??? ?????? ??????
        # df = df.reset_index(drop=True)  # ????????? ?????? ??????

        # pd.set_option('max_rows', None)  # ?????????????????? ?????? ???, ?????? ??? ???????????? ??????
        # pd.set_option('max_columns', None)  # ?????????????????? ?????? ???, ?????? ??? ???????????? ??????
        df = df.loc[df['?????????'] == "???????????????"]

        def extract_fabric(s):
            for i, c in enumerate(s):
                if c == ']':
                    return s[1:i]

        def extract_option(s):
            s = s.split("<??????>")[-1].split('|')
            s_strip = [_s.strip() for _s in s]

            ret = "\n "
            for _s in s_strip:
                if "?????? / ???????????????" in _s:
                    option_name, option_value = [__s.strip() for __s in _s.split(":")]
                    option_value = ' '.join(option_value.split(' ')[1:])

                    _s = f"{option_name} : {option_value}"
                elif "??????????????? ??? ??????" in _s:
                    option_name, option_value, *others = [__s.strip() for __s in _s.split(":")]
                    option_value = ' '.join(option_value.split(' ')[:1])

                    _s = f"{option_name} : {option_value}"

                ret += f"{_s}\n "

            return ret

        def add_line_break(s):
            line_len = 24
            if len(s) <= line_len:
                return s
            else:
                ret = ""
                for idx in range(0, len(s), line_len):
                    ret += f"{s[idx:idx+line_len]}\n "
                return ret[:-2]

        df['????????? ?????????'] = df['????????? ?????????'].apply(extract_fabric)  # ????????????????????? ?????? ?????? ????????? ??????
        df['????????? ??????'] = df['????????? ??????'].apply(extract_option)  # ????????????????????? ?????? ?????? ????????? ??????
        df['????????????'] = df['????????????'].apply(add_line_break)  # ????????????????????? ?????? ?????? ????????? ??????

        # print(df)

        df_file_name = "my_new_excel.xlsx"

        # ????????? ?????? ????????? ????????????????????? ?????? ????????? ??????
        # df.to_excel(join(BASE_DIR, df_file_name), index=False)

        writer = pd.ExcelWriter(path.join(BASE_DIR, 'strapforyou', 'files', new_filename), engine='xlsxwriter')
        df.to_excel(writer, sheet_name='Sheet1', index=False)  # send df to writer
        worksheet = writer.sheets["Sheet1"]  # pull worksheet object

        alphabet_string = string.ascii_uppercase
        offset = 20

        workbook = writer.book
        worksheet = writer.sheets['Sheet1']

        format = workbook.add_format({'text_wrap': True})
        format.set_align('center')
        format.set_align('vcenter')

        format_seller_option = workbook.add_format({'text_wrap': True})
        format_seller_option.set_align('vcenter')

        for idx, col in enumerate(df.columns):  # loop through all columns
            _max_len = 0
            series = df[col]
            if col == "????????? ??????":
                for index, value in series.items():
                    for v in value.split("\n "):
                        v_str = str(v)
                        _max_len = len(v_str) if _max_len < len(v_str) else _max_len

                worksheet.set_column(idx, idx, _max_len + offset, format_seller_option)  # set column width

            else:

                for index, value in series.items():
                    value_str = str(value)
                    for v in str(value).split('\n'):
                        _max_len = len(v) if _max_len < len(v) else _max_len

                worksheet.set_column(idx, idx, _max_len + offset, format)  # set column width

        writer.save()